
assert = require 'assert'
ObjectFilter = require '../src/index'

describe 'Numbers', ->

	it 'should filter a number in string', (done) ->

		filter =
			'count': ObjectFilter.number()
		
		input =
			'count': '125635'

		result = ObjectFilter.run filter, input
		assert result.success
		assert.equal result.data.count, 125635
		done()
