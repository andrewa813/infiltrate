(function() {
  var $filter, ArrayDescriptor, Descriptor, EnumFilter, InputError, InputFilter, _, filters, runFilter, runImpl,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  _ = require('lodash');

  filters = [];

  Descriptor = (function() {
    function Descriptor(type1, filter1, options1, optional) {
      this.type = type1;
      this.filter = filter1;
      this.options = options1;
      this.optional = optional;
    }

    return Descriptor;

  })();

  ArrayDescriptor = (function() {
    function ArrayDescriptor(meta1, max1, min1) {
      this.meta = meta1;
      this.max = max1;
      this.min = min1;
    }

    return ArrayDescriptor;

  })();

  InputFilter = (function() {
    function InputFilter() {}

    InputFilter.prototype.prepare = function(input, options) {
      return input;
    };

    InputFilter.prototype.validate = function(input, options) {
      return true;
    };

    InputFilter.prototype.transform = function(input, options) {
      return input;
    };

    InputFilter.prototype.errorMessage = function(type, keyPath, options) {
      return "Invalid input (" + type + ") for path: " + keyPath;
    };

    return InputFilter;

  })();

  EnumFilter = (function(superClass) {
    extend(EnumFilter, superClass);

    function EnumFilter(list) {
      this.list = list;
    }

    EnumFilter.prototype.validate = function(input, options) {
      return this.list.indexOf(input) >= 0;
    };

    return EnumFilter;

  })(InputFilter);

  InputError = (function(superClass) {
    extend(InputError, superClass);

    function InputError(field, type1, message) {
      this.field = field;
      this.type = type1;
      this.message = message;
    }

    return InputError;

  })(Error);

  $filter = function(key, opts) {
    var filter;
    filter = !_.isArray(key) ? filters[key] : new EnumFilter(key);
    return new Descriptor(key, filter, opts, false);
  };

  $filter.optional = function(key, opts) {
    var filter;
    filter = !_.isArray(key) ? filters[key] : new EnumFilter(key);
    return new Descriptor(key, filter, opts, true);
  };

  $filter.register = function(key, filter) {
    var i, item, len, results;
    if (_.isArray(key)) {
      results = [];
      for (i = 0, len = key.length; i < len; i++) {
        item = key[i];
        results.push(filters[item] = filter);
      }
      return results;
    } else if (_.isString(key)) {
      return filters[key] = filter;
    }
  };

  $filter.array = function() {
    var max, meta, min;
    switch (arguments.length) {
      case 1:
        meta = arguments[0];
        break;
      case 2:
        max = arguments[0], meta = arguments[1];
        break;
      case 3:
        min = arguments[0], max = arguments[1], meta = arguments[2];
    }
    return new ArrayDescriptor(meta, max != null ? max : 0, min != null ? min : 0);
  };

  $filter.InputFilter = InputFilter;

  $filter.InputError = InputError;

  runFilter = function(filter, value, keyPath, options) {
    value = filter.prepare(value, options);
    if (!filter.validate(value, options)) {
      throw new InputError(keyPath, "filter-" + metaField.type, filter.errorMessage(metaField.type, keyPath, options));
    }
    return filter.transform(value, options);
  };

  runImpl = function(meta, input, data, keyPath, opts) {
    var base, filter, i, index, j, key, metaField, ref, ref1, value;
    for (key in meta) {
      metaField = meta[key];
      value = input[key];
      keyPath = keyPath ? keyPath + "." + key : key;
      if (_.isPlainObject(value)) {
        return runImpl(metaField, input[key], data[key] = {}, keyPath);
      }
      if (metaField instanceof Descriptor) {
        if ((value === void 0 || value === null) && !metaField.optional) {
          throw new InputError(keyPath, 'empty', "Field (" + keyPath + ") must be defined.");
        }
        data[key] = runFilter(metaField.filter, value, keyPath, metaField.options);
      } else if (metaField instanceof ArrayDescriptor) {
        if ((value === void 0 || value === null) && _.isInteger(metaField.min)) {
          throw new InputError(keyPath, 'empty', "Field (" + keyPath + ") must be a valid array.");
        }
        if (!_.isArray(value)) {
          throw new InputError(keyPath, 'array', "Field (" + keyPath + ") must be a valid array.");
        }
        if (metaField.min > 0 && value.length < metaField.min) {
          throw new InputError(keyPath, 'array', "Array (" + keyPath + ") length must be greater than " + min + ".");
        }
        if (metaField.max > 0 && value.length > metaField.max) {
          throw new InputError(keyPath, 'array', "Array (" + keyPath + ") length must be less than " + mx + ".");
        }
        meta = metaField.meta;
        data[key] = [];
        if (_.isString(meta)) {
          filter = $filter(meta);
          for (index = i = 0, ref = value.length - 1; 0 <= ref ? i <= ref : i >= ref; index = 0 <= ref ? ++i : --i) {
            data[key][index] = runFilter(filter, value[key], keyPath + "[" + index + "]", {});
          }
        } else if (_.isPlainObject(meta)) {
          for (index = j = 0, ref1 = value.length - 1; 0 <= ref1 ? j <= ref1 : j >= ref1; index = 0 <= ref1 ? ++j : --j) {
            runImpl(meta, value[index], (base = data[key])[index] != null ? base[index] : base[index] = {}, keyPath + "[" + index + "]");
          }
        } else {
          throw new InputError(keyPath, 'array', "Field at '#keyPath' has an invalid descriptor.");
        }
      } else {
        throw new InputError(keyPath, 'invalid', "Unsupported filter descriptor: " + metaField);
      }
    }
  };

  $filter.run = function(filter, input, opts) {
    var data;
    data = {};
    runImpl(filter, input, data, '', opts);
    return data;
  };

  $filter.middleware = function(filter) {
    return function(req, res, next) {
      var e;
      try {
        req.input = $filter.run(filter, req.input);
        return next(null);
      } catch (error) {
        e = error;
        return next(e);
      }
    };
  };

  require('./builtin')($filter);

  module.exports = $filter;

}).call(this);

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VzIjpbImluZGV4LmNvZmZlZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFDQTtBQUFBLE1BQUEseUdBQUE7SUFBQTs7O0VBQUEsQ0FBQSxHQUFJLE9BQUEsQ0FBUSxRQUFSOztFQUNKLE9BQUEsR0FBVTs7RUFFSjtJQUNRLG9CQUFDLEtBQUQsRUFBUSxPQUFSLEVBQWlCLFFBQWpCLEVBQTJCLFFBQTNCO01BQUMsSUFBQyxDQUFBLE9BQUQ7TUFBTyxJQUFDLENBQUEsU0FBRDtNQUFTLElBQUMsQ0FBQSxVQUFEO01BQVUsSUFBQyxDQUFBLFdBQUQ7SUFBM0I7Ozs7OztFQUVSO0lBQ1EseUJBQUMsS0FBRCxFQUFRLElBQVIsRUFBYyxJQUFkO01BQUMsSUFBQyxDQUFBLE9BQUQ7TUFBTyxJQUFDLENBQUEsTUFBRDtNQUFNLElBQUMsQ0FBQSxNQUFEO0lBQWQ7Ozs7OztFQUVSOzs7MEJBQ0wsT0FBQSxHQUFTLFNBQUMsS0FBRCxFQUFRLE9BQVI7YUFBb0I7SUFBcEI7OzBCQUNULFFBQUEsR0FBVSxTQUFDLEtBQUQsRUFBUSxPQUFSO2FBQW9CO0lBQXBCOzswQkFDVixTQUFBLEdBQVcsU0FBQyxLQUFELEVBQVEsT0FBUjthQUFvQjtJQUFwQjs7MEJBQ1gsWUFBQSxHQUFjLFNBQUMsSUFBRCxFQUFPLE9BQVAsRUFBZ0IsT0FBaEI7YUFBNEIsaUJBQUEsR0FBa0IsSUFBbEIsR0FBdUIsY0FBdkIsR0FBcUM7SUFBakU7Ozs7OztFQUVUOzs7SUFDUSxvQkFBQyxJQUFEO01BQUMsSUFBQyxDQUFBLE9BQUQ7SUFBRDs7eUJBQ2IsUUFBQSxHQUFVLFNBQUMsS0FBRCxFQUFRLE9BQVI7YUFBb0IsSUFBQyxDQUFBLElBQUksQ0FBQyxPQUFOLENBQWMsS0FBZCxDQUFBLElBQXdCO0lBQTVDOzs7O0tBRmM7O0VBSW5COzs7SUFDUSxvQkFBQyxLQUFELEVBQVMsS0FBVCxFQUFnQixPQUFoQjtNQUFDLElBQUMsQ0FBQSxRQUFEO01BQVEsSUFBQyxDQUFB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O0VBS2QsT0FBTyxDQUFDLFVBQVIsR0FBcUIsU0FBQyxNQUFEO1dBQ3BCLFNBQUMsR0FBRCxFQUFNLEdBQU4sRUFBVyxJQUFYO0FBQ0MsVUFBQTtBQUFBO1FBQ0MsR0FBRyxDQUFDLEtBQUosR0FBWSxPQUFPLENBQUMsR0FBUixDQUFZLE1BQVosRUFBb0IsR0FBRyxDQUFDLEtBQXhCO2VBQ1osSUFBQSxDQUFLLElBQUwsRUFGRDtPQUFBLGFBQUE7UUFHTTtlQUNMLElBQUEsQ0FBSyxDQUFMLEVBSkQ7O0lBREQ7RUFEb0I7O0VBUXJCLE9BQUEsQ0FBUSxXQUFSLENBQUEsQ0FBcUIsT0FBckI7O0VBQ0EsTUFBTSxDQUFDLE9BQVAsR0FBaUI7QUE1R2pCIiwic291cmNlc0NvbnRlbnQiOlsiXHJcbl8gPSByZXF1aXJlICdsb2Rhc2gnXHJcbmZpbHRlcnMgPSBbXVxyXG5cclxuY2xhc3MgRGVzY3JpcHRvclxyXG5cdGNvbnN0cnVjdG9yOiAoQHR5cGUsIEBmaWx0ZXIsIEBvcHRpb25zLCBAb3B0aW9uYWwpIC0+XHJcblx0XHRcclxuY2xhc3MgQXJyYXlEZXNjcmlwdG9yXHJcblx0Y29uc3RydWN0b3I6IChAbWV0YSwgQG1heCwgQG1pbikgLT5cclxuXHJcbmNsYXNzIElucHV0RmlsdGVyXHJcblx0cHJlcGFyZTogKGlucHV0LCBvcHRpb25zKSAtPiBpbnB1dFxyXG5cdHZhbGlkYXRlOiAoaW5wdXQsIG9wdGlvbnMpIC0+IHRydWVcclxuXHR0cmFuc2Zvcm06IChpbnB1dCwgb3B0aW9ucykgLT4gaW5wdXRcclxuXHRlcnJvck1lc3NhZ2U6ICh0eXBlLCBrZXlQYXRoLCBvcHRpb25zKSAtPiBcIkludmFsaWQgaW5wdXQgKCN7dHlwZX0pIGZvciBwYXRoOiAje2tleVBhdGh9XCJcclxuXHJcbmNsYXNzIEVudW1GaWx0ZXIgZXh0ZW5kcyBJbnB1dEZpbHRlclxyXG5cdGNvbnN0cnVjdG9yOiAoQGxpc3QpIC0+XHJcblx0dmFsaWRhdGU6IChpbnB1dCwgb3B0aW9ucykgLT4gQGxpc3QuaW5kZXhPZihpbnB1dCkgPj0gMFxyXG5cclxuY2xhc3MgSW5wdXRFcnJvciBleHRlbmRzIEVycm9yXHJcblx0Y29uc3RydWN0b3I6IChAZmllbGQsIEB0eXBlLCBAbWVzc2FnZSkgLT5cclxuXHJcbiRmaWx0ZXIgPSAoa2V5LCBvcHRzKSAtPlxyXG5cdGZpbHRlciA9IHVubGVzcyBfLmlzQXJyYXkga2V5IHRoZW4gZmlsdGVyc1trZXldIGVsc2UgbmV3IEVudW1GaWx0ZXIga2V5XHJcblx0bmV3IERlc2NyaXB0b3Iga2V5LCBmaWx0ZXIsIG9wdHMsIGZhbHNlXHJcblxyXG4kZmlsdGVyLm9wdGlvbmFsID0gKGtleSwgb3B0cykgLT5cclxuXHRmaWx0ZXIgPSB1bmxlc3MgXy5pc0FycmF5IGtleSB0aGVuIGZpbHRlcnNba2V5XSBlbHNlIG5ldyBFbnVtRmlsdGVyIGtleVxyXG5cdG5ldyBEZXNjcmlwdG9yIGtleSwgZmlsdGVyLCBvcHRzLCB0cnVlXHJcblxyXG4kZmlsdGVyLnJlZ2lzdGVyID0gKGtleSwgZmlsdGVyKSAtPlxyXG5cdGlmIF8uaXNBcnJheSBrZXlcclxuXHRcdGZvciBpdGVtIGluIGtleVxyXG5cdFx0XHRmaWx0ZXJzW2l0ZW1dID0gZmlsdGVyXHJcblx0ZWxzZSBpZiBfLmlzU3RyaW5nIGtleVxyXG5cdFx0ZmlsdGVyc1trZXldID0gZmlsdGVyXHJcblxyXG4kZmlsdGVyLmFycmF5ID0gLT5cclxuXHRzd2l0Y2ggYXJndW1lbnRzLmxlbmd0aFxyXG5cdFx0d2hlbiAxIHRoZW4gWyBtZXRhIF0gPSBhcmd1bWVudHNcclxuXHRcdHdoZW4gMiB0aGVuIFsgbWF4LCBtZXRhIF0gPSBhcmd1bWVudHNcclxuXHRcdHdoZW4gMyB0aGVuIFsgbWluLCBtYXgsIG1ldGEgXSA9IGFyZ3VtZW50c1xyXG5cdG5ldyBBcnJheURlc2NyaXB0b3IgbWV0YSwgbWF4ID8gMCwgbWluID8gMFxyXG5cclxuJGZpbHRlci5JbnB1dEZpbHRlciA9IElucHV0RmlsdGVyXHJcbiRmaWx0ZXIuSW5wdXRFcnJvciA9IElucHV0RXJyb3JcclxuXHJcbnJ1bkZpbHRlciA9IChmaWx0ZXIsIHZhbHVlLCBrZXlQYXRoLCBvcHRpb25zKSAtPlxyXG5cdHZhbHVlID0gZmlsdGVyLnByZXBhcmUgdmFsdWUsIG9wdGlvbnNcclxuXHR1bmxlc3MgZmlsdGVyLnZhbGlkYXRlIHZhbHVlLCBvcHRpb25zXHJcblx0XHR0aHJvdyBuZXcgSW5wdXRFcnJvciBrZXlQYXRoLCBcImZpbHRlci0je21ldGFGaWVsZC50eXBlfVwiLFxyXG5cdFx0XHRmaWx0ZXIuZXJyb3JNZXNzYWdlKG1ldGFGaWVsZC50eXBlLCBrZXlQYXRoLCBvcHRpb25zKVxyXG5cdHJldHVybiBmaWx0ZXIudHJhbnNmb3JtIHZhbHVlLCBvcHRpb25zXHJcblxyXG5ydW5JbXBsID0gKG1ldGEsIGlucHV0LCBkYXRhLCBrZXlQYXRoLCBvcHRzKSAtPlxyXG5cclxuXHRmb3Iga2V5LCBtZXRhRmllbGQgb2YgbWV0YVxyXG5cdFx0dmFsdWUgPSBpbnB1dFtrZXldXHJcblx0XHRrZXlQYXRoID0gaWYga2V5UGF0aCB0aGVuIFwiI3trZXlQYXRofS4je2tleX1cIiBlbHNlIGtleVxyXG5cdFx0cmV0dXJuIHJ1bkltcGwgbWV0YUZpZWxkLCBpbnB1dFtrZXldLCBkYXRhW2tleV0gPSB7fSwga2V5UGF0aCBpZiBfLmlzUGxhaW5PYmplY3QgdmFsdWVcclxuXHJcblx0XHRpZiBtZXRhRmllbGQgaW5zdGFuY2VvZiBEZXNjcmlwdG9yXHJcblx0XHRcdGlmICh2YWx1ZSBpcyB1bmRlZmluZWQgb3IgdmFsdWUgaXMgbnVsbCkgYW5kIG5vdCBtZXRhRmllbGQub3B0aW9uYWxcclxuXHRcdFx0XHR0aHJvdyBuZXcgSW5wdXRFcnJvciBrZXlQYXRoLCAnZW1wdHknLCBcIkZpZWxkICgje2tleVBhdGh9KSBtdXN0IGJlIGRlZmluZWQuXCJcclxuXHRcdFx0ZGF0YVtrZXldID0gcnVuRmlsdGVyIG1ldGFGaWVsZC5maWx0ZXIsIHZhbHVlLCBrZXlQYXRoLCBtZXRhRmllbGQub3B0aW9uc1xyXG5cdFx0XHJcblx0XHRlbHNlIGlmIG1ldGFGaWVsZCBpbnN0YW5jZW9mIEFycmF5RGVzY3JpcHRvclxyXG5cdFx0XHRpZiAodmFsdWUgaXMgdW5kZWZpbmVkIG9yIHZhbHVlIGlzIG51bGwpIGFuZCBfLmlzSW50ZWdlciBtZXRhRmllbGQubWluXHJcblx0XHRcdFx0dGhyb3cgbmV3IElucHV0RXJyb3Iga2V5UGF0aCwgJ2VtcHR5JywgXCJGaWVsZCAoI3trZXlQYXRofSkgbXVzdCBiZSBhIHZhbGlkIGFycmF5LlwiXHJcblx0XHRcdHVubGVzcyBfLmlzQXJyYXkgdmFsdWVcclxuXHRcdFx0XHR0aHJvdyBuZXcgSW5wdXRFcnJvciBrZXlQYXRoLCAnYXJyYXknLCBcIkZpZWxkICgje2tleVBhdGh9KSBtdXN0IGJlIGEgdmFsaWQgYXJyYXkuXCJcclxuXHRcdFx0aWYgbWV0YUZpZWxkLm1pbiA+IDAgYW5kIHZhbHVlLmxlbmd0aCA8IG1ldGFGaWVsZC5taW5cclxuXHRcdFx0XHR0aHJvdyBuZXcgSW5wdXRFcnJvciBrZXlQYXRoLCAnYXJyYXknLCBcIkFycmF5ICgje2tleVBhdGh9KSBsZW5ndGggbXVzdCBiZSBncmVhdGVyIHRoYW4gI3ttaW59LlwiXHJcblx0XHRcdGlmIG1ldGFGaWVsZC5tYXggPiAwIGFuZCB2YWx1ZS5sZW5ndGggPiBtZXRhRmllbGQubWF4XHJcblx0XHRcdFx0dGhyb3cgbmV3IElucHV0RXJyb3Iga2V5UGF0aCwgJ2FycmF5JywgXCJBcnJheSAoI3trZXlQYXRofSkgbGVuZ3RoIG11c3QgYmUgbGVzcyB0aGFuICN7bXh9LlwiXHJcblx0XHRcdFxyXG5cdFx0XHRtZXRhID0gbWV0YUZpZWxkLm1ldGFcclxuXHRcdFx0ZGF0YVtrZXldID0gW11cclxuXHRcdFx0XHJcblx0XHRcdGlmIF8uaXNTdHJpbmcgbWV0YVxyXG5cdFx0XHRcdGZpbHRlciA9ICRmaWx0ZXIgbWV0YVxyXG5cdFx0XHRcdGZvciBpbmRleCBpbiBbMC4udmFsdWUubGVuZ3RoIC0gMV1cclxuXHRcdFx0XHRcdGRhdGFba2V5XVtpbmRleF0gPSBydW5GaWx0ZXIgZmlsdGVyLCB2YWx1ZVtrZXldLCBcIiN7a2V5UGF0aH1bI3tpbmRleH1dXCIsIHt9XHJcblx0XHRcdFxyXG5cdFx0XHRlbHNlIGlmIF8uaXNQbGFpbk9iamVjdCBtZXRhXHJcblx0XHRcdFx0Zm9yIGluZGV4IGluIFswLi52YWx1ZS5sZW5ndGggLSAxXVxyXG5cdFx0XHRcdFx0cnVuSW1wbCBtZXRhLCB2YWx1ZVtpbmRleF0sIGRhdGFba2V5XVtpbmRleF0gPz0ge30sIFwiI3trZXlQYXRofVsje2luZGV4fV1cIlxyXG5cdFx0XHRcclxuXHRcdFx0ZWxzZVxyXG5cdFx0XHRcdHRocm93IG5ldyBJbnB1dEVycm9yIGtleVBhdGgsICdhcnJheScsIFwiRmllbGQgYXQgJyNrZXlQYXRoJyBoYXMgYW4gaW52YWxpZCBkZXNjcmlwdG9yLlwiXHJcblx0XHRcdFxyXG5cdFx0ZWxzZVxyXG5cdFx0XHR0aHJvdyBuZXcgSW5wdXRFcnJvciBrZXlQYXRoLCAnaW52YWxpZCcsIFwiVW5zdXBwb3J0ZWQgZmlsdGVyIGRlc2NyaXB0b3I6ICN7bWV0YUZpZWxkfVwiXHJcblxyXG4kZmlsdGVyLnJ1biA9IChmaWx0ZXIsIGlucHV0LCBvcHRzKSAtPlxyXG5cdGRhdGEgPSB7fVxyXG5cdHJ1bkltcGwgZmlsdGVyLCBpbnB1dCwgZGF0YSwgJycsIG9wdHNcclxuXHRyZXR1cm4gZGF0YVxyXG5cclxuJGZpbHRlci5taWRkbGV3YXJlID0gKGZpbHRlcikgLT5cclxuXHQocmVxLCByZXMsIG5leHQpIC0+XHJcblx0XHR0cnlcclxuXHRcdFx0cmVxLmlucHV0ID0gJGZpbHRlci5ydW4gZmlsdGVyLCByZXEuaW5wdXRcclxuXHRcdFx0bmV4dCBudWxsXHJcblx0XHRjYXRjaCBlXHJcblx0XHRcdG5leHQgZVxyXG5cclxucmVxdWlyZSgnLi9idWlsdGluJykgJGZpbHRlclxyXG5tb2R1bGUuZXhwb3J0cyA9ICRmaWx0ZXJcclxuIl19
