
_ = require 'lodash'
validator = require 'validator'

class ObjectFilter
	constructor: (opts) ->
		_.assignInWith @, opts

	array: ->
		@is_array = true
		@is_array_bound = false
		switch arguments.length
			when 1
				@is_array_bound = true
				[ @get_array_max ] = arguments
				@get_array_min = @get_array_max
			when 2
				@is_array_bound = true
				[ @get_array_min, @get_array_max ] = arguments
		return @

	optional: ->
		@is_optional = true
		return @

	validate: (input) -> true
	transform: (input) -> input
	default: -> undefined
	set: (option, value) ->
		@[option] = value

ObjectFilter.mongoId = -> new ObjectFilter
	name: 'mongoId'
	validate: (input) ->
		return false unless _.isString input
		return validator.isMongoId input

ObjectFilter.number = -> new ObjectFilter
	name: 'number'
	validate: (input) ->
		return validator.isInt input
	transform: (input) ->
		return validator.toInt input
		
ObjectFilter.email = -> new ObjectFilter
	name: 'email'
	validate: (input) ->
		return false unless _.isString input
		return validator.isEmail input

ObjectFilter.enum = (list) -> new ObjectFilter
	name: 'enum'
	validate: (input) ->
		return list.indexOf(input) >= 0

ObjectFilter.string = -> new ObjectFilter
	name: 'string'
	validate: (input) ->
		return _.isString input

ObjectFilter.boolean = -> new ObjectFilter
	name: 'boolean'
	validate: (input) ->
		return validator.isBoolean input
	transform: (input) ->
		return validator.toBoolean input, true

ObjectFilter.uuid = -> new ObjectFilter
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
		else if filterValue instanceof ObjectFilter
			
			# Optional
			if not inputValue
				if filterValue.optional
					defaultValue = filterValue.default()
					data[key] = defaultValue if defaultValue
				else
					return { success: false, path: newKeyPath, reason: 'required' }

			# Array
			if filterValue.is_array
				if not _.isArray inputValue
					return { success: false, path: newKeyPath, reason: 'array' }

				if filterValue.is_array_bound
					unless filterValue.get_array_min <= inputValue.length <= filterValue.get_array_max
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

ObjectFilter.run = (filter, input, opts) ->
	return { success: false } unless _.isPlainObject filter
	return { success: false } unless _.isPlainObject input
	return runImpl filter, input, {}, '', opts

module.exports = ObjectFilter
