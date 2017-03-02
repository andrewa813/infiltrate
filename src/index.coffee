
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
	errorMessage: (type, keyPath, options) -> "Invalid input (#{type}) for path: #{keyPath}"

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

runFilter = (filter, value, keyPath, options) ->
	value = filter.prepare value, options
	unless filter.validate value, options
		throw new InputError keyPath, "filter-#{metaField.type}",
			filter.errorMessage(metaField.type, keyPath, options)
	return filter.transform value, options

runImpl = (meta, input, data, keyPath, opts) ->

	for key, metaField of meta
		value = input[key]
		keyPath = if keyPath then "#{keyPath}.#{key}" else key
		return runImpl metaField, input[key], data[key] = {}, keyPath if _.isPlainObject value

		if metaField instanceof Descriptor
			if (value is undefined or value is null) and not metaField.optional
				throw new InputError keyPath, 'empty', "Field (#{keyPath}) must be defined."
			data[key] = runFilter metaField.filter, value, keyPath, metaField.options
		
		else if metaField instanceof ArrayDescriptor
			if (value is undefined or value is null) and _.isInteger metaField.min
				throw new InputError keyPath, 'empty', "Field (#{keyPath}) must be a valid array."
			unless _.isArray value
				throw new InputError keyPath, 'array', "Field (#{keyPath}) must be a valid array."
			if metaField.min > 0 and value.length < metaField.min
				throw new InputError keyPath, 'array', "Array (#{keyPath}) length must be greater than #{min}."
			if metaField.max > 0 and value.length > metaField.max
				throw new InputError keyPath, 'array', "Array (#{keyPath}) length must be less than #{mx}."
			
			meta = metaField.meta
			data[key] = []
			
			if _.isString meta
				filter = $filter meta
				for index in [0..value.length - 1]
					data[key][index] = runFilter filter, value[key], "#{keyPath}[#{index}]", {}
			
			else if _.isPlainObject meta
				for index in [0..value.length - 1]
					runImpl meta, value[index], data[key][index] ?= {}, "#{keyPath}[#{index}]"
			
			else
				throw new InputError keyPath, 'array', "Field at '#keyPath' has an invalid descriptor."
			
		else
			throw new InputError keyPath, 'invalid', "Unsupported filter descriptor: #{metaField}"

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
