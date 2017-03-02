
_ = require 'lodash'
validator = require 'validator'

module.exports = ($filter) ->
    $filter.register ['string', String], new $filter.InputFilter
        validate: (input, opts) ->
            return _.isString input
    
    $filter.register ['int', 'integer'], new $filter.InputFilter
        validate: (input, opts) ->
            return validator.isInt input
        transform: (input, opts) ->
            return validator.toInt input

    $filter.register 'email', new $filter.InputFilter
        validate: (input, opts) ->
            return false unless _.isString input
            return validator.isEmail input
        transform: (input, opts) ->
            return input.toLowerCase()
    
    $filter.register ['bool', 'boolean', Boolean], new $filter.InputFilter
        validate: (input, opts) ->
            return validator.isBoolean input
        transform: (input, opts) ->
            return validator.toBoolean input, true
    
    $filter.register 'uuid', new $filter.InputFilter
        validate: (input, opts) ->
            return false unless _.isString input
            return validator.isUUID input
            
    $filter.register ['mongo', 'mongoId'], new $filter.InputFilter
        validate: (input, opts) ->
            return false unless _.isString input
            return validator.isMongoId input
