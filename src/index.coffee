
_ = require 'lodash'
validator = require 'validator'

class InputFilter
	constructor: (opts) ->
		_.assignInWith @, opts

	array: ->
		@_array = {}
		@_array.bound = false
		switch arguments.length
			when 1
				@_array._bound = true
				[ @_array.max ] = arguments
				@_array.min = @_array.max
			when 2
				@_array._bound = true
				[ @_array.min, @_array.max ] = arguments
		return @

	optional: (defaultValue) ->
		@_optional = {}
		@_optional.defaultValue = defaultValue
		return @

	validate: (input) -> true
	transform: (input) -> input

	set: (option, value) ->
		@[option] = value
		return @

InputFilter.mongoId = -> new InputFilter
	name: 'mongoId'
	validate: (input) ->
		return false unless _.isString input
		return validator.isMongoId input

InputFilter.number = -> new InputFilter
	name: 'number'
	validate: (input) ->
		return validator.isInt input
	transform: (input) ->
		return validator.toInt input
		
InputFilter.email = -> new InputFilter
	name: 'email'
	validate: (input) ->
		return false unless _.isString input
		return validator.isEmail input
	transform: (input) ->
		return input.toLowerCase()

InputFilter.enum = (list) -> new InputFilter
	name: 'enum'
	validate: (input) ->
		return list.indexOf(input) >= 0

InputFilter.string = -> new InputFilter
	name: 'string'
	validate: (input) ->
		return _.isString input

InputFilter.boolean = -> new InputFilter
	name: 'boolean'
	validate: (input) ->
		return validator.isBoolean input
	transform: (input) ->
		return validator.toBoolean input, true

InputFilter.uuid = -> new InputFilter
	name: 'uuid'
	validate: (input) ->
		return false unless _.isString input
		return validator.isUUID input

runImpl = (filter, input, data, keyPath, opts) ->

	for key, filterValue of filter
		inputValue = input[key]

		newKeyPath = if keyPath then "#{keyPath}." else ''
		newKeyPath = "#{newKeyPath}#{key}"

		# Plain Object
		if _.isPlainObject filterValue
			
			if _.isPlainObject inputValue
				data[key] = {}
				runImpl filterValue, inputValue, data[key], newKeyPath, opts
			else
				return { success: false, path: newKeyPath, reason: 'object' }

		# Filter
		else if filterValue instanceof InputFilter
			
			# Optional
			if not inputValue
				if filterValue.optional
					defaultValue = filterValue.defaultValue
					data[key] = defaultValue if defaultValue
				else
					return { success: false, path: newKeyPath, reason: 'required' }

			# Array
			if filterValue._array
				if not _.isArray inputValue
					return { success: false, path: newKeyPath, reason: 'array' }

				if filterValue._array.bound
					unless filterValue._array.min <= inputValue.length <= filterValue._array.max
						return { success: false, path: newKeyPath, reason: 'array-length' }

				data[key] = []
				for inputValueElement, index in inputValue
					valid = filterValue.validate inputValueElement
					return { success: false, path: newKeyPath, reason: 'invalid', index: index } unless valid
					newValue = filterValue.transform inputValueElement
					data[key][index] = newValue
			
			# Single
			else
				valid = filterValue.validate inputValue
				return { success: false, path: newKeyPath, reason: 'invalid' } unless valid
				newValue = filterValue.transform inputValue
				data[key] = newValue

		# Others
		#else
		# TODO: Filter Error

	return { success: true, data: data }

InputFilter.run = (filter, input, opts) ->
	return { success: false } unless _.isPlainObject filter
	return { success: false } unless _.isPlainObject input
	return runImpl filter, input, {}, '', opts

InputFilter.middleware = (filter) ->
	(req, res, next) ->
		try
			result = InputFilter.run filter, req.input
			return next new Error result unless result?.success
			next null
		catch e
			next e

module.exports = InputFilter
