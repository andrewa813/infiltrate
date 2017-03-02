
assert = require 'assert'
$filter = require '../src/index'

describe 'Numbers', ->

	it 'should filter an integer in string', (done) ->

		filter =
			'count': $filter 'integer'
		
		input =
			'count': '125635'

		result = $filter.run filter, input
		assert.equal result.count, 125635
		done()
	
	it 'should filter based on array', (done) ->
		filter =
			'count': $filter.array
				'test': $filter 'integer'
		
		input =
			'count': [
				'test': '509999'
			]
		
		result = $filter.run filter, input
		assert.equal result.count[0].test, 509999
		done()
