
_ = require 'lodash'
filters = []

class Descriptor
	constructor: (@type, @filter, @options, @optional) ->
		
class ArrayDescriptor
	constructor: (@meta, @max, @min) ->

class InputFilter
	prepare: (input, options) -> input
	validate: (input, options) -> true
	transform: (input, options) -> input
	errorMessage: (value, keyPath, type, options) -> "Invalid input (#{type}) for path '#{keyPath}': #{value}"

class EnumFilter extends InputFilter
	constructor: (@list) ->
	validate: (input, options) -> @list.indexOf(input) >= 0

class InputError extends Error
	constructor: (@field, @type, @message) ->

$filter = (key, opts) ->
	filter = unless _.isArray key then filters[key] else new EnumFilter key
	new Descriptor key, filter, opts, false

$filter.optional = (key, opts) ->
	filter = unless _.isArray key then filters[key] else new EnumFilter key
	new Descriptor key, filter, opts, true

$filter.register = (key, filter) ->
	if _.isArray key
		for item in key
			filters[item] = filter
	else if _.isString key
		filters[key] = filter

$filter.array = ->
	switch arguments.length
		when 1 then [ meta ] = arguments
		when 2 then [ max, meta ] = arguments
		when 3 then [ min, max, meta ] = arguments
	new ArrayDescriptor meta, max ? 0, min ? 0

$filter.InputFilter = InputFilter
$filter.InputError = InputError

runFilter = (filter, value, keyPath, type, options) ->
	value = filter.prepare value, options
	unless filter.validate value, options
		throw new InputError keyPath, "filter-#{type}",
			filter.errorMessage(value, keyPath, type, options)
	return filter.transform value, options

runImpl = (meta, input, data, keyPath, opts) ->

	for key, metaField of meta
		value = input[key]
		newKeyPath = if keyPath then "#{keyPath}.#{key}" else key

		if _.isPlainObject metaField
			runImpl metaField, value ? {}, data[key] = {}, newKeyPath, opts
			continue

		if metaField instanceof Descriptor
			if (value is undefined or value is null)
				unless metaField.optional
					throw new InputError newKeyPath, 'empty', "Field (#{newKeyPath}) must be defined."
				continue
			data[key] = runFilter metaField.filter, value, newKeyPath, metaField.type, metaField.options
		
		else if metaField instanceof ArrayDescriptor
			if value is undefined or value is null
				throw new InputError newKeyPath, 'empty', "Field (#{newKeyPath}) must be a valid array."
			unless _.isArray value
				throw new InputError newKeyPath, 'array', "Field (#{newKeyPath}) must be a valid array."
			if metaField.min > 0 and value.length < metaField.min
				throw new InputError newKeyPath, 'array', "Array (#{newKeyPath}) length must be greater than #{min}."
			if metaField.max > 0 and value.length > metaField.max
				throw new InputError newKeyPath, 'array', "Array (#{newKeyPath}) length must be less than #{mx}."
			
			data[key] = []
			
			if value.length > 0

				if _.isString metaField.meta
					filter = $filter metaField.meta
					for index in [0..value.length - 1]
						data[key][index] = runFilter filter, value[key], "#{newKeyPath}[#{index}]", metaField.type, metaField.options
					
				else if _.isPlainObject metaField.meta
					for index in [0..value.length - 1]
						runImpl metaField.meta, value[index], data[key][index] ?= {}, "#{newKeyPath}[#{index}]", opts
			
				else
					throw new InputError newKeyPath, 'array', "Field at '#{newKeyPath}' has an invalid descriptor."
			
		else
			throw new InputError newKeyPath, 'invalid', "Unsupported filter descriptor at '#{newKeyPath}': #{metaField}"

$filter.run = (filter, input, opts) ->
	data = {}
	runImpl filter, input, data, '', opts
	return data

$filter.middleware = (filter) ->
	(req, res, next) ->
		try
			req.input = $filter.run filter, req.input
			next null
		catch e
			next e

require('./builtin') $filter
module.exports = $filter
