(function() {
  var InputFilter, _, runImpl, validator;

  _ = require('lodash');

  validator = require('validator');

  InputFilter = (function() {
    function InputFilter(opts) {
      _.assignInWith(this, opts);
    }

    InputFilter.prototype.array = function() {
      this._array = {};
      this._array.bound = false;
      switch (arguments.length) {
        case 1:
          this._array._bound = true;
          this._array.max = arguments[0];
          this._array.min = this._array.max;
          break;
        case 2:
          this._array._bound = true;
          this._array.min = arguments[0], this._array.max = arguments[1];
      }
      return this;
    };

    InputFilter.prototype.optional = function(defaultValue) {
      this._optional = {};
      this._optional.defaultValue = defaultValue;
      return this;
    };

    InputFilter.prototype.validate = function(input) {
      return true;
    };

    InputFilter.prototype.transform = function(input) {
      return input;
    };

    InputFilter.prototype.set = function(option, value) {
      this[option] = value;
      return this;
    };

    return InputFilter;

  })();

  InputFilter.mongoId = function() {
    return new InputFilter({
      name: 'mongoId',
      validate: function(input) {
        if (!_.isString(input)) {
          return false;
        }
        return validator.isMongoId(input);
      }
    });
  };

  InputFilter.number = function() {
    return new InputFilter({
      name: 'number',
      validate: function(input) {
        return validator.isInt(input);
      },
      transform: function(input) {
        return validator.toInt(input);
      }
    });
  };

  InputFilter.email = function() {
    return new InputFilter({
      name: 'email',
      validate: function(input) {
        if (!_.isString(input)) {
          return false;
        }
        return validator.isEmail(input);
      }
    });
  };

  InputFilter["enum"] = function(list) {
    return new InputFilter({
      name: 'enum',
      validate: function(input) {
        return list.indexOf(input) >= 0;
      }
    });
  };

  InputFilter.string = function() {
    return new InputFilter({
      name: 'string',
      validate: function(input) {
        return _.isString(input);
      }
    });
  };

  InputFilter.boolean = function() {
    return new InputFilter({
      name: 'boolean',
      validate: function(input) {
        return validator.isBoolean(input);
      },
      transform: function(input) {
        return validator.toBoolean(input, true);
      }
    });
  };

  InputFilter.uuid = function() {
    return new InputFilter({
      name: 'uuid',
      validate: function(input) {
        if (!_.isString(input)) {
          return false;
        }
        return validator.isUUID(input);
      }
    });
  };

  runImpl = function(filter, input, data, keyPath, opts) {
    var defaultValue, filterValue, i, index, inputValue, inputValueElement, key, len, newKeyPath, newValue, ref, valid;
    for (key in filter) {
      filterValue = filter[key];
      inputValue = input[key];
      newKeyPath = keyPath ? keyPath + "." : '';
      newKeyPath = "" + newKeyPath + key;
      if (_.isPlainObject(filterValue)) {
        if (_.isPlainObject(inputValue)) {
          data[key] = {};
          runImpl(filterValue, inputValue, data[key], newKeyPath, opts);
        } else {
          return {
            success: false,
            path: newKeyPath,
            reason: 'object'
          };
        }
      } else if (filterValue instanceof InputFilter) {
        if (!inputValue) {
          if (filterValue.optional) {
            defaultValue = filterValue.defaultValue;
            if (defaultValue) {
              data[key] = defaultValue;
            }
          } else {
            return {
              success: false,
              path: newKeyPath,
              reason: 'required'
            };
          }
        }
        if (filterValue._array) {
          if (!_.isArray(inputValue)) {
            return {
              success: false,
              path: newKeyPath,
              reason: 'array'
            };
          }
          if (filterValue._array.bound) {
            if (!((filterValue._array.min <= (ref = inputValue.length) && ref <= filterValue._array.max))) {
              return {
                success: false,
                path: newKeyPath,
                reason: 'array-length'
              };
            }
          }
          data[key] = [];
          for (index = i = 0, len = inputValue.length; i < len; index = ++i) {
            inputValueElement = inputValue[index];
            valid = filterValue.validate(inputValueElement);
            if (!valid) {
              return {
                success: false,
                path: newKeyPath,
                reason: 'invalid',
                index: index
              };
            }
            newValue = filterValue.transform(inputValueElement);
            data[key][index] = newValue;
          }
        } else {
          valid = filterValue.validate(inputValue);
          if (!valid) {
            return {
              success: false,
              path: newKeyPath,
              reason: 'invalid'
            };
          }
          newValue = filterValue.transform(inputValue);
          data[key] = newValue;
        }
      }
    }
    return {
      success: true,
      data: data
    };
  };

  InputFilter.run = function(filter, input, opts) {
    if (!_.isPlainObject(filter)) {
      return {
        success: false
      };
    }
    if (!_.isPlainObject(input)) {
      return {
        success: false
      };
    }
    return runImpl(filter, input, {}, '', opts);
  };

  InputFilter.middleware = function(filter) {
    return function(req, res, next) {
      var e, result;
      try {
        result = InputFilter.run(filter, req.input);
        if (!(result != null ? result.success : void 0)) {
          return next(new Error(result));
        }
        return next(null);
      } catch (error) {
        e = error;
        return next(e);
      }
    };
  };

  module.exports = InputFilter;

}).call(this);

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VzIjpbImluZGV4LmNvZmZlZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFDQTtBQUFBLE1BQUE7O0VBQUEsQ0FBQSxHQUFJLE9BQUEsQ0FBUSxRQUFSOztFQUNKLFNBQUEsR0FBWSxPQUFBLENBQVEsV0FBUjs7RUFFTjtJQUNRLHFCQUFDLElBQUQ7TUFDWixDQUFDLENBQUMsWUFBRixDQUFlLElBQWYsRUFBa0IsSUFBbEI7SUFEWTs7MEJBR2IsS0FBQSxHQUFPLFNBQUE7TUFDTixJQUFDLENBQUEsTUFBRCxHQUFVO01BQ1YsSUFBQyxDQUFBLE1BQU0sQ0FBQyxLQUFSLEdBQWdCO0FBQ2hCLGNBQU8sU0FBUyxDQUFDLE1BQWpCO0FBQUEsYUFDTSxDQUROO1VBRUUsSUFBQyxDQUFBLE1BQU0sQ0FBQyxNQUFSLEdBQWlCO1VBQ2YsSUFBQyxDQUFBLE1BQU0sQ0FBQyxNQUFRO1VBQ2xCLElBQUMsQ0FBQSxNQUFNLENBQUMsR0FBUixHQUFjLElBQUMsQ0FBQSxNQUFNLENBQUM7QUFIbEI7QUFETixhQUtNLENBTE47VUFNRSxJQUFDLENBQUEsTUFBTSxDQUFDLE1BQVIsR0FBaUI7VUFDZixJQUFDLENBQUEsTUFBTSxDQUFDLGtCQUFWLEVBQWUsSUFBQyxDQUFBLE1BQU0sQ0FBQztBQVB6QjtBQVFBLGFBQU87SUFYRDs7MEJBYVAsUUFBQSxHQUFVLFNBQUMsWUFBRDtNQUNULElBQUMsQ0FBQSxTQUFELEdBQWE7TUFDYixJQUFDLENBQUEsU0FBUyxDQUFDLFlBQVgsR0FBMEI7QUFDMUIsYUFBTztJQUhFOzswQkFLVixRQUFBLEdBQVUsU0FBQyxLQUFEO2FBQVc7SUFBWDs7MEJBQ1YsU0FBQSxHQUFXLFNBQUMsS0FBRDthQUFXO0lBQVg7OzBCQUVYLEdBQUEsR0FBSyxTQUFDLE1BQUQsRUFBUyxLQUFUO01BQ0osSUFBRSxDQUFBLE1BQUEsQ0FBRixHQUFZO0FBQ1osYUFBTztJQUZIOzs7Ozs7RUFJTixXQUFXLENBQUMsT0FBWixHQUFzQixT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TixFQUFXLElBQVg7QUFDQyxVQUFBO0FBQUE7UUFDQyxNQUFBLEdBQVMsV0FBVyxDQUFDLEdBQVosQ0FBZ0IsTUFBaEIsRUFBd0IsR0FBRyxDQUFDLEtBQTVCO1FBQ1QsSUFBQSxtQkFBb0MsTUFBTSxDQUFFLGlCQUE1QztBQUFBLGlCQUFPLElBQUEsQ0FBUyxJQUFBLEtBQUEsQ0FBTSxNQUFOLENBQVQsRUFBUDs7ZUFDQSxJQUFBLENBQUssSUFBTCxFQUhEO09BQUEsYUFBQTtRQUlNO2VBQ0wsSUFBQSxDQUFLLENBQUwsRUFMRDs7SUFERDtFQUR3Qjs7RUFTekIsTUFBTSxDQUFDLE9BQVAsR0FBaUI7QUFqSmpCIiwic291cmNlc0NvbnRlbnQiOlsiXHJcbl8gPSByZXF1aXJlICdsb2Rhc2gnXHJcbnZhbGlkYXRvciA9IHJlcXVpcmUgJ3ZhbGlkYXRvcidcclxuXHJcbmNsYXNzIElucHV0RmlsdGVyXHJcblx0Y29uc3RydWN0b3I6IChvcHRzKSAtPlxyXG5cdFx0Xy5hc3NpZ25JbldpdGggQCwgb3B0c1xyXG5cclxuXHRhcnJheTogLT5cclxuXHRcdEBfYXJyYXkgPSB7fVxyXG5cdFx0QF9hcnJheS5ib3VuZCA9IGZhbHNlXHJcblx0XHRzd2l0Y2ggYXJndW1lbnRzLmxlbmd0aFxyXG5cdFx0XHR3aGVuIDFcclxuXHRcdFx0XHRAX2FycmF5Ll9ib3VuZCA9IHRydWVcclxuXHRcdFx0XHRbIEBfYXJyYXkubWF4IF0gPSBhcmd1bWVudHNcclxuXHRcdFx0XHRAX2FycmF5Lm1pbiA9IEBfYXJyYXkubWF4XHJcblx0XHRcdHdoZW4gMlxyXG5cdFx0XHRcdEBfYXJyYXkuX2JvdW5kID0gdHJ1ZVxyXG5cdFx0XHRcdFsgQF9hcnJheS5taW4sIEBfYXJyYXkubWF4IF0gPSBhcmd1bWVudHNcclxuXHRcdHJldHVybiBAXHJcblxyXG5cdG9wdGlvbmFsOiAoZGVmYXVsdFZhbHVlKSAtPlxyXG5cdFx0QF9vcHRpb25hbCA9IHt9XHJcblx0XHRAX29wdGlvbmFsLmRlZmF1bHRWYWx1ZSA9IGRlZmF1bHRWYWx1ZVxyXG5cdFx0cmV0dXJuIEBcclxuXHJcblx0dmFsaWRhdGU6IChpbnB1dCkgLT4gdHJ1ZVxyXG5cdHRyYW5zZm9ybTogKGlucHV0KSAtPiBpbnB1dFxyXG5cclxuXHRzZXQ6IChvcHRpb24sIHZhbHVlKSAtPlxyXG5cdFx0QFtvcHRpb25dID0gdmFsdWVcclxuXHRcdHJldHVybiBAXHJcblxyXG5JbnB1dEZpbHRlci5tb25nb0lkID0gLT4gbmV3IElucHV0RmlsdGVyXHJcblx0bmFtZTogJ21vbmdvSWQnXHJcblx0dmFsaWRhdGU6IChpbnB1dCkgLT5cclxuXHRcdHJldHVybiBmYWxzZSB1bmxlc3MgXy5pc1N0cmluZyBpbnB1dFxyXG5cdFx0cmV0dXJuIHZhbGlkYXRvci5pc01vbmdvSWQgaW5wdXRcclxuXHJcbklucHV0RmlsdGVyLm51bWJlciA9IC0+IG5ldyBJbnB1dEZpbHRlclxyXG5cdG5hbWU6ICdudW1iZXInXHJcblx0dmFsaWRhdGU6IChpbnB1dCkgLT5cclxuXHRcdHJldHVybiB2YWxpZGF0b3IuaXNJbnQgaW5wdXRcclxuXHR0cmFuc2Zvcm06IChpbnB1dCkgLT5cclxuXHRcdHJldHVybiB2YWxpZGF0b3IudG9JbnQgaW5wdXRcclxuXHRcdFxyXG5JbnB1dEZpbHRlci5lbWFpbCA9IC0+IG5ldyBJbnB1dEZpbHRlclxyXG5cdG5hbWU6ICdlbWFpbCdcclxuXHR2YWxpZGF0ZTogKGlucHV0KSAtPlxyXG5cdFx0cmV0dXJuIGZhbHNlIHVubGVzcyBfLmlzU3RyaW5nIGlucHV0XHJcblx0XHRyZXR1cm4gdmFsaWRhdG9yLmlzRW1haWwgaW5wdXRcclxuXHJcbklucHV0RmlsdGVyLmVudW0gPSAobGlzdCkgLT4gbmV3IElucHV0RmlsdGVyXHJcblx0bmFtZTogJ2VudW0nXHJcblx0dmFsaWRhdGU6IChpbnB1dCkgLT5cclxuXHRcdHJldHVybiBsaXN0LmluZGV4T2YoaW5wdXQpID49IDBcclxuXHJcbklucHV0RmlsdGVyLnN0cmluZyA9IC0+IG5ldyBJbnB1dEZpbHRlclxyXG5cdG5hbWU6ICdzdHJpbmcnXHJcblx0dmFsaWRhdGU6IChpbnB1dCkgLT5cclxuXHRcdHJldHVybiBfLmlzU3RyaW5nIGlucHV0XHJcblxyXG5JbnB1dEZpbHRlci5ib29sZWFuID0gLT4gbmV3IElucHV0RmlsdGVyXHJcblx0bmFtZTogJ2Jvb2xlYW4nXHJcblx0dmFsaWRhdGU6IChpbnB1dCkgLT5cclxuXHRcdHJldHVybiB2YWxpZGF0b3IuaXNCb29sZWFuIGlucHV0XHJcblx0dHJhbnNmb3JtOiAoaW5wdXQpIC0+XHJcblx0XHRyZXR1cm4gdmFsaWRhdG9yLnRvQm9vbGVhbiBpbnB1dCwgdHJ1ZVxyXG5cclxuSW5wdXRGaWx0ZXIudXVpZCA9IC0+IG5ldyBJbnB1dEZpbHRlclxyXG5cdG5hbWU6ICd1dWlkJ1xyXG5cdHZhbGlkYXRlOiAoaW5wdXQpIC0+XHJcblx0XHRyZXR1cm4gZmFsc2UgdW5sZXNzIF8uaXNTdHJpbmcgaW5wdXRcclxuXHRcdHJldHVybiB2YWxpZGF0b3IuaXNVVUlEIGlucHV0XHJcblxyXG5ydW5JbXBsID0gKGZpbHRlciwgaW5wdXQsIGRhdGEsIGtleVBhdGgsIG9wdHMpIC0+XHJcblxyXG5cdGZvciBrZXksIGZpbHRlclZhbHVlIG9mIGZpbHRlclxyXG5cdFx0aW5wdXRWYWx1ZSA9IGlucHV0W2tleV1cclxuXHJcblx0XHRuZXdLZXlQYXRoID0gaWYga2V5UGF0aCB0aGVuIFwiI3trZXlQYXRofS5cIiBlbHNlICcnXHJcblx0XHRuZXdLZXlQYXRoID0gXCIje25ld0tleVBhdGh9I3trZXl9XCJcclxuXHJcblx0XHQjIFBsYWluIE9iamVjdFxyXG5cdFx0aWYgXy5pc1BsYWluT2JqZWN0IGZpbHRlclZhbHVlXHJcblx0XHRcdFxyXG5cdFx0XHRpZiBfLmlzUGxhaW5PYmplY3QgaW5wdXRWYWx1ZVxyXG5cdFx0XHRcdGRhdGFba2V5XSA9IHt9XHJcblx0XHRcdFx0cnVuSW1wbCBmaWx0ZXJWYWx1ZSwgaW5wdXRWYWx1ZSwgZGF0YVtrZXldLCBuZXdLZXlQYXRoLCBvcHRzXHJcblx0XHRcdGVsc2VcclxuXHRcdFx0XHRyZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgcGF0aDogbmV3S2V5UGF0aCwgcmVhc29uOiAnb2JqZWN0JyB9XHJcblxyXG5cdFx0IyBGaWx0ZXJcclxuXHRcdGVsc2UgaWYgZmlsdGVyVmFsdWUgaW5zdGFuY2VvZiBJbnB1dEZpbHRlclxyXG5cdFx0XHRcclxuXHRcdFx0IyBPcHRpb25hbFxyXG5cdFx0XHRpZiBub3QgaW5wdXRWYWx1ZVxyXG5cdFx0XHRcdGlmIGZpbHRlclZhbHVlLm9wdGlvbmFsXHJcblx0XHRcdFx0XHRkZWZhdWx0VmFsdWUgPSBmaWx0ZXJWYWx1ZS5kZWZhdWx0VmFsdWVcclxuXHRcdFx0XHRcdGRhdGFba2V5XSA9IGRlZmF1bHRWYWx1ZSBpZiBkZWZhdWx0VmFsdWVcclxuXHRcdFx0XHRlbHNlXHJcblx0XHRcdFx0XHRyZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgcGF0aDogbmV3S2V5UGF0aCwgcmVhc29uOiAncmVxdWlyZWQnIH1cclxuXHJcblx0XHRcdCMgQXJyYXlcclxuXHRcdFx0aWYgZmlsdGVyVmFsdWUuX2FycmF5XHJcblx0XHRcdFx0aWYgbm90IF8uaXNBcnJheSBpbnB1dFZhbHVlXHJcblx0XHRcdFx0XHRyZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgcGF0aDogbmV3S2V5UGF0aCwgcmVhc29uOiAnYXJyYXknIH1cclxuXHJcblx0XHRcdFx0aWYgZmlsdGVyVmFsdWUuX2FycmF5LmJvdW5kXHJcblx0XHRcdFx0XHR1bmxlc3MgZmlsdGVyVmFsdWUuX2FycmF5Lm1pbiA8PSBpbnB1dFZhbHVlLmxlbmd0aCA8PSBmaWx0ZXJWYWx1ZS5fYXJyYXkubWF4XHJcblx0XHRcdFx0XHRcdHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBwYXRoOiBuZXdLZXlQYXRoLCByZWFzb246ICdhcnJheS1sZW5ndGgnIH1cclxuXHJcblx0XHRcdFx0ZGF0YVtrZXldID0gW11cclxuXHRcdFx0XHRmb3IgaW5wdXRWYWx1ZUVsZW1lbnQsIGluZGV4IGluIGlucHV0VmFsdWVcclxuXHRcdFx0XHRcdHZhbGlkID0gZmlsdGVyVmFsdWUudmFsaWRhdGUgaW5wdXRWYWx1ZUVsZW1lbnRcclxuXHRcdFx0XHRcdHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBwYXRoOiBuZXdLZXlQYXRoLCByZWFzb246ICdpbnZhbGlkJywgaW5kZXg6IGluZGV4IH0gdW5sZXNzIHZhbGlkXHJcblx0XHRcdFx0XHRuZXdWYWx1ZSA9IGZpbHRlclZhbHVlLnRyYW5zZm9ybSBpbnB1dFZhbHVlRWxlbWVudFxyXG5cdFx0XHRcdFx0ZGF0YVtrZXldW2luZGV4XSA9IG5ld1ZhbHVlXHJcblx0XHRcdFxyXG5cdFx0XHQjIFNpbmdsZVxyXG5cdFx0XHRlbHNlXHJcblx0XHRcdFx0dmFsaWQgPSBmaWx0ZXJWYWx1ZS52YWxpZGF0ZSBpbnB1dFZhbHVlXHJcblx0XHRcdFx0cmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIHBhdGg6IG5ld0tleVBhdGgsIHJlYXNvbjogJ2ludmFsaWQnIH0gdW5sZXNzIHZhbGlkXHJcblx0XHRcdFx0bmV3VmFsdWUgPSBmaWx0ZXJWYWx1ZS50cmFuc2Zvcm0gaW5wdXRWYWx1ZVxyXG5cdFx0XHRcdGRhdGFba2V5XSA9IG5ld1ZhbHVlXHJcblxyXG5cdFx0IyBPdGhlcnNcclxuXHRcdCNlbHNlXHJcblx0XHQjIFRPRE86IEZpbHRlciBFcnJvclxyXG5cclxuXHRyZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBkYXRhOiBkYXRhIH1cclxuXHJcbklucHV0RmlsdGVyLnJ1biA9IChmaWx0ZXIsIGlucHV0LCBvcHRzKSAtPlxyXG5cdHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlIH0gdW5sZXNzIF8uaXNQbGFpbk9iamVjdCBmaWx0ZXJcclxuXHRyZXR1cm4geyBzdWNjZXNzOiBmYWxzZSB9IHVubGVzcyBfLmlzUGxhaW5PYmplY3QgaW5wdXRcclxuXHRyZXR1cm4gcnVuSW1wbCBmaWx0ZXIsIGlucHV0LCB7fSwgJycsIG9wdHNcclxuXHJcbklucHV0RmlsdGVyLm1pZGRsZXdhcmUgPSAoZmlsdGVyKSAtPlxyXG5cdChyZXEsIHJlcywgbmV4dCkgLT5cclxuXHRcdHRyeVxyXG5cdFx0XHRyZXN1bHQgPSBJbnB1dEZpbHRlci5ydW4gZmlsdGVyLCByZXEuaW5wdXRcclxuXHRcdFx0cmV0dXJuIG5leHQgbmV3IEVycm9yIHJlc3VsdCB1bmxlc3MgcmVzdWx0Py5zdWNjZXNzXHJcblx0XHRcdG5leHQgbnVsbFxyXG5cdFx0Y2F0Y2ggZVxyXG5cdFx0XHRuZXh0IGVcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gSW5wdXRGaWx0ZXJcclxuIl19
