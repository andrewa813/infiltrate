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

    InputFilter.prototype.errorMessage = function(value, keyPath, type, options) {
      return "Invalid input (" + type + ") for path '" + keyPath + "': " + value;
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

  runFilter = function(filter, value, keyPath, type, options) {
    value = filter.prepare(value, options);
    if (!filter.validate(value, options)) {
      throw new InputError(keyPath, "filter-" + type, filter.errorMessage(value, keyPath, type, options));
    }
    return filter.transform(value, options);
  };

  runImpl = function(meta, input, data, keyPath, opts) {
    var filter, index, key, metaField, newKeyPath, results, value;
    results = [];
    for (key in meta) {
      metaField = meta[key];
      value = input[key];
      newKeyPath = keyPath ? keyPath + "." + key : key;
      if (_.isPlainObject(metaField)) {
        runImpl(metaField, value != null ? value : {}, data[key] = {}, newKeyPath, opts);
        continue;
      }
      if (metaField instanceof Descriptor) {
        if (value === void 0 || value === null) {
          if (!metaField.optional) {
            throw new InputError(newKeyPath, 'empty', "Field (" + newKeyPath + ") must be defined.");
          }
          continue;
        }
        results.push(data[key] = runFilter(metaField.filter, value, newKeyPath, metaField.type, metaField.options));
      } else if (metaField instanceof ArrayDescriptor) {
        if (value === void 0 || value === null) {
          throw new InputError(newKeyPath, 'empty', "Field (" + newKeyPath + ") must be a valid array.");
        }
        if (!_.isArray(value)) {
          throw new InputError(newKeyPath, 'array', "Field (" + newKeyPath + ") must be a valid array.");
        }
        if (metaField.min > 0 && value.length < metaField.min) {
          throw new InputError(newKeyPath, 'array', "Array (" + newKeyPath + ") length must be greater than " + min + ".");
        }
        if (metaField.max > 0 && value.length > metaField.max) {
          throw new InputError(newKeyPath, 'array', "Array (" + newKeyPath + ") length must be less than " + mx + ".");
        }
        data[key] = [];
        if (value.length > 0) {
          if (_.isString(metaField.meta)) {
            filter = $filter(metaField.meta);
            results.push((function() {
              var i, ref, results1;
              results1 = [];
              for (index = i = 0, ref = value.length - 1; 0 <= ref ? i <= ref : i >= ref; index = 0 <= ref ? ++i : --i) {
                results1.push(data[key][index] = runFilter(filter, value[key], newKeyPath + "[" + index + "]", metaField.type, metaField.options));
              }
              return results1;
            })());
          } else if (_.isPlainObject(metaField.meta)) {
            results.push((function() {
              var base, i, ref, results1;
              results1 = [];
              for (index = i = 0, ref = value.length - 1; 0 <= ref ? i <= ref : i >= ref; index = 0 <= ref ? ++i : --i) {
                results1.push(runImpl(metaField.meta, value[index], (base = data[key])[index] != null ? base[index] : base[index] = {}, newKeyPath + "[" + index + "]", opts));
              }
              return results1;
            })());
          } else {
            throw new InputError(newKeyPath, 'array', "Field at '" + newKeyPath + "' has an invalid descriptor.");
          }
        } else {
          results.push(void 0);
        }
      } else {
        throw new InputError(newKeyPath, 'invalid', "Unsupported filter descriptor at '" + newKeyPath + "': " + metaField);
      }
    }
    return results;
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VzIjpbImluZGV4LmNvZmZlZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFDQTtBQUFBLE1BQUEseUdBQUE7SUFBQTs7O0VBQUEsQ0FBQSxHQUFJLE9BQUEsQ0FBUSxRQUFSOztFQUNKLE9BQUEsR0FBVTs7RUFFSjtJQUNRLG9CQUFDLEtBQUQsRUFBUSxPQUFSLEVBQWlCLFFBQWpCLEVBQTJCLFFBQTNCO01BQUMsSUFBQyxDQUFBLE9BQUQ7TUFBTyxJQUFDLENBQUEsU0FBRDtNQUFTLElBQUMsQ0FBQSxVQUFEO01BQVUsSUFBQyxDQUFBLFdBQUQ7SUFBM0I7Ozs7OztFQUVSO0lBQ1EseUJBQUMsS0FBRCxFQUFRLElBQVIsRUFBYyxJQUFkO01BQUMsSUFBQyxDQUFBLE9BQUQ7TUFBTyxJQUFDLENBQUEsTUFBRDtNQUFNLElBQUMsQ0FBQSxNQUFEO0lBQWQ7Ozs7OztFQUVSOzs7MEJBQ0wsT0FBQSxHQUFTLFNBQUMsS0FBRCxFQUFRLE9BQVI7YUFBb0I7SUFBcEI7OzBCQUNULFFBQUEsR0FBVSxTQUFDLEtBQUQsRUFBUSxPQUFSO2FBQW9CO0lBQXBCOzswQkFDVixTQUFBLEdBQVcsU0FBQyxLQUFELEVBQVEsT0FBUjthQUFvQjtJQUFwQjs7MEJBQ1gsWUFBQSxHQUFjLFNBQUMsS0FBRCxFQUFRLE9BQVIsRUFBaUIsSUFBakIsRUFBdUIsT0FBdkI7YUFBbUMsaUJBQUEsR0FBa0IsSUFBbEIsR0FBdUIsY0FBdkIsR0FBcUMsT0FBckMsR0FBNkMsS0FBN0MsR0FBa0Q7SUFBckY7Ozs7OztFQUVUOzs7SUFDUSxvQkFBQyxJQUFEO01BQUMsSUFBQyxDQUFBLE9BQUQ7SUFBRDs7eUJBQ2IsUUFBQSxHQUFVLFNBQUMsS0FBRCxFQUFRLE9BQVI7YUFBb0IsSUFBQyxDQUFBLElBQUksQ0FBQyxPQUFOLENBQWMsS0FBZCxDQUFBLElBQXdCO0lBQTVDOzs7O0tBRmM7O0VBSW5COzs7SUFDUSxvQkFBQyxLQUFELEVBQVMsS0FBVCxFQUFnQixPQUFo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QUF2RixFQTNCTjs7QUFmTjs7RUFGUzs7RUE4Q1YsT0FBTyxDQUFDLEdBQVIsR0FBYyxTQUFDLE1BQUQsRUFBUyxLQUFULEVBQWdCLElBQWhCO0FBQ2IsUUFBQTtJQUFBLElBQUEsR0FBTztJQUNQLE9BQUEsQ0FBUSxNQUFSLEVBQWdCLEtBQWhCLEVBQXVCLElBQXZCLEVBQTZCLEVBQTdCLEVBQWlDLElBQWpDO0FBQ0EsV0FBTztFQUhNOztFQUtkLE9BQU8sQ0FBQyxVQUFSLEdBQXFCLFNBQUMsTUFBRDtXQUNwQixTQUFDLEdBQUQsRUFBTSxHQUFOLEVBQVcsSUFBWDtBQUNDLFVBQUE7QUFBQTtRQUNDLEdBQUcsQ0FBQyxLQUFKLEdBQVksT0FBTyxDQUFDLEdBQVIsQ0FBWSxNQUFaLEVBQW9CLEdBQUcsQ0FBQyxLQUF4QjtlQUNaLElBQUEsQ0FBSyxJQUFMLEVBRkQ7T0FBQSxhQUFBO1FBR007ZUFDTCxJQUFBLENBQUssQ0FBTCxFQUpEOztJQUREO0VBRG9COztFQVFyQixPQUFBLENBQVEsV0FBUixDQUFBLENBQXFCLE9BQXJCOztFQUNBLE1BQU0sQ0FBQyxPQUFQLEdBQWlCO0FBbEhqQiIsInNvdXJjZXNDb250ZW50IjpbIlxyXG5fID0gcmVxdWlyZSAnbG9kYXNoJ1xyXG5maWx0ZXJzID0gW11cclxuXHJcbmNsYXNzIERlc2NyaXB0b3JcclxuXHRjb25zdHJ1Y3RvcjogKEB0eXBlLCBAZmlsdGVyLCBAb3B0aW9ucywgQG9wdGlvbmFsKSAtPlxyXG5cdFx0XHJcbmNsYXNzIEFycmF5RGVzY3JpcHRvclxyXG5cdGNvbnN0cnVjdG9yOiAoQG1ldGEsIEBtYXgsIEBtaW4pIC0+XHJcblxyXG5jbGFzcyBJbnB1dEZpbHRlclxyXG5cdHByZXBhcmU6IChpbnB1dCwgb3B0aW9ucykgLT4gaW5wdXRcclxuXHR2YWxpZGF0ZTogKGlucHV0LCBvcHRpb25zKSAtPiB0cnVlXHJcblx0dHJhbnNmb3JtOiAoaW5wdXQsIG9wdGlvbnMpIC0+IGlucHV0XHJcblx0ZXJyb3JNZXNzYWdlOiAodmFsdWUsIGtleVBhdGgsIHR5cGUsIG9wdGlvbnMpIC0+IFwiSW52YWxpZCBpbnB1dCAoI3t0eXBlfSkgZm9yIHBhdGggJyN7a2V5UGF0aH0nOiAje3ZhbHVlfVwiXHJcblxyXG5jbGFzcyBFbnVtRmlsdGVyIGV4dGVuZHMgSW5wdXRGaWx0ZXJcclxuXHRjb25zdHJ1Y3RvcjogKEBsaXN0KSAtPlxyXG5cdHZhbGlkYXRlOiAoaW5wdXQsIG9wdGlvbnMpIC0+IEBsaXN0LmluZGV4T2YoaW5wdXQpID49IDBcclxuXHJcbmNsYXNzIElucHV0RXJyb3IgZXh0ZW5kcyBFcnJvclxyXG5cdGNvbnN0cnVjdG9yOiAoQGZpZWxkLCBAdHlwZSwgQG1lc3NhZ2UpIC0+XHJcblxyXG4kZmlsdGVyID0gKGtleSwgb3B0cykgLT5cclxuXHRmaWx0ZXIgPSB1bmxlc3MgXy5pc0FycmF5IGtleSB0aGVuIGZpbHRlcnNba2V5XSBlbHNlIG5ldyBFbnVtRmlsdGVyIGtleVxyXG5cdG5ldyBEZXNjcmlwdG9yIGtleSwgZmlsdGVyLCBvcHRzLCBmYWxzZVxyXG5cclxuJGZpbHRlci5vcHRpb25hbCA9IChrZXksIG9wdHMpIC0+XHJcblx0ZmlsdGVyID0gdW5sZXNzIF8uaXNBcnJheSBrZXkgdGhlbiBmaWx0ZXJzW2tleV0gZWxzZSBuZXcgRW51bUZpbHRlciBrZXlcclxuXHRuZXcgRGVzY3JpcHRvciBrZXksIGZpbHRlciwgb3B0cywgdHJ1ZVxyXG5cclxuJGZpbHRlci5yZWdpc3RlciA9IChrZXksIGZpbHRlcikgLT5cclxuXHRpZiBfLmlzQXJyYXkga2V5XHJcblx0XHRmb3IgaXRlbSBpbiBrZXlcclxuXHRcdFx0ZmlsdGVyc1tpdGVtXSA9IGZpbHRlclxyXG5cdGVsc2UgaWYgXy5pc1N0cmluZyBrZXlcclxuXHRcdGZpbHRlcnNba2V5XSA9IGZpbHRlclxyXG5cclxuJGZpbHRlci5hcnJheSA9IC0+XHJcblx0c3dpdGNoIGFyZ3VtZW50cy5sZW5ndGhcclxuXHRcdHdoZW4gMSB0aGVuIFsgbWV0YSBdID0gYXJndW1lbnRzXHJcblx0XHR3aGVuIDIgdGhlbiBbIG1heCwgbWV0YSBdID0gYXJndW1lbnRzXHJcblx0XHR3aGVuIDMgdGhlbiBbIG1pbiwgbWF4LCBtZXRhIF0gPSBhcmd1bWVudHNcclxuXHRuZXcgQXJyYXlEZXNjcmlwdG9yIG1ldGEsIG1heCA/IDAsIG1pbiA/IDBcclxuXHJcbiRmaWx0ZXIuSW5wdXRGaWx0ZXIgPSBJbnB1dEZpbHRlclxyXG4kZmlsdGVyLklucHV0RXJyb3IgPSBJbnB1dEVycm9yXHJcblxyXG5ydW5GaWx0ZXIgPSAoZmlsdGVyLCB2YWx1ZSwga2V5UGF0aCwgdHlwZSwgb3B0aW9ucykgLT5cclxuXHR2YWx1ZSA9IGZpbHRlci5wcmVwYXJlIHZhbHVlLCBvcHRpb25zXHJcblx0dW5sZXNzIGZpbHRlci52YWxpZGF0ZSB2YWx1ZSwgb3B0aW9uc1xyXG5cdFx0dGhyb3cgbmV3IElucHV0RXJyb3Iga2V5UGF0aCwgXCJmaWx0ZXItI3t0eXBlfVwiLFxyXG5cdFx0XHRmaWx0ZXIuZXJyb3JNZXNzYWdlKHZhbHVlLCBrZXlQYXRoLCB0eXBlLCBvcHRpb25zKVxyXG5cdHJldHVybiBmaWx0ZXIudHJhbnNmb3JtIHZhbHVlLCBvcHRpb25zXHJcblxyXG5ydW5JbXBsID0gKG1ldGEsIGlucHV0LCBkYXRhLCBrZXlQYXRoLCBvcHRzKSAtPlxyXG5cclxuXHRmb3Iga2V5LCBtZXRhRmllbGQgb2YgbWV0YVxyXG5cdFx0dmFsdWUgPSBpbnB1dFtrZXldXHJcblx0XHRuZXdLZXlQYXRoID0gaWYga2V5UGF0aCB0aGVuIFwiI3trZXlQYXRofS4je2tleX1cIiBlbHNlIGtleVxyXG5cclxuXHRcdGlmIF8uaXNQbGFpbk9iamVjdCBtZXRhRmllbGRcclxuXHRcdFx0cnVuSW1wbCBtZXRhRmllbGQsIHZhbHVlID8ge30sIGRhdGFba2V5XSA9IHt9LCBuZXdLZXlQYXRoLCBvcHRzXHJcblx0XHRcdGNvbnRpbnVlXHJcblxyXG5cdFx0aWYgbWV0YUZpZWxkIGluc3RhbmNlb2YgRGVzY3JpcHRvclxyXG5cdFx0XHRpZiAodmFsdWUgaXMgdW5kZWZpbmVkIG9yIHZhbHVlIGlzIG51bGwpXHJcblx0XHRcdFx0dW5sZXNzIG1ldGFGaWVsZC5vcHRpb25hbFxyXG5cdFx0XHRcdFx0dGhyb3cgbmV3IElucHV0RXJyb3IgbmV3S2V5UGF0aCwgJ2VtcHR5JywgXCJGaWVsZCAoI3tuZXdLZXlQYXRofSkgbXVzdCBiZSBkZWZpbmVkLlwiXHJcblx0XHRcdFx0Y29udGludWVcclxuXHRcdFx0ZGF0YVtrZXldID0gcnVuRmlsdGVyIG1ldGFGaWVsZC5maWx0ZXIsIHZhbHVlLCBuZXdLZXlQYXRoLCBtZXRhRmllbGQudHlwZSwgbWV0YUZpZWxkLm9wdGlvbnNcclxuXHRcdFxyXG5cdFx0ZWxzZSBpZiBtZXRhRmllbGQgaW5zdGFuY2VvZiBBcnJheURlc2NyaXB0b3JcclxuXHRcdFx0aWYgdmFsdWUgaXMgdW5kZWZpbmVkIG9yIHZhbHVlIGlzIG51bGxcclxuXHRcdFx0XHR0aHJvdyBuZXcgSW5wdXRFcnJvciBuZXdLZXlQYXRoLCAnZW1wdHknLCBcIkZpZWxkICgje25ld0tleVBhdGh9KSBtdXN0IGJlIGEgdmFsaWQgYXJyYXkuXCJcclxuXHRcdFx0dW5sZXNzIF8uaXNBcnJheSB2YWx1ZVxyXG5cdFx0XHRcdHRocm93IG5ldyBJbnB1dEVycm9yIG5ld0tleVBhdGgsICdhcnJheScsIFwiRmllbGQgKCN7bmV3S2V5UGF0aH0pIG11c3QgYmUgYSB2YWxpZCBhcnJheS5cIlxyXG5cdFx0XHRpZiBtZXRhRmllbGQubWluID4gMCBhbmQgdmFsdWUubGVuZ3RoIDwgbWV0YUZpZWxkLm1pblxyXG5cdFx0XHRcdHRocm93IG5ldyBJbnB1dEVycm9yIG5ld0tleVBhdGgsICdhcnJheScsIFwiQXJyYXkgKCN7bmV3S2V5UGF0aH0pIGxlbmd0aCBtdXN0IGJlIGdyZWF0ZXIgdGhhbiAje21pbn0uXCJcclxuXHRcdFx0aWYgbWV0YUZpZWxkLm1heCA+IDAgYW5kIHZhbHVlLmxlbmd0aCA+IG1ldGFGaWVsZC5tYXhcclxuXHRcdFx0XHR0aHJvdyBuZXcgSW5wdXRFcnJvciBuZXdLZXlQYXRoLCAnYXJyYXknLCBcIkFycmF5ICgje25ld0tleVBhdGh9KSBsZW5ndGggbXVzdCBiZSBsZXNzIHRoYW4gI3tteH0uXCJcclxuXHRcdFx0XHJcblx0XHRcdGRhdGFba2V5XSA9IFtdXHJcblx0XHRcdFxyXG5cdFx0XHRpZiB2YWx1ZS5sZW5ndGggPiAwXHJcblxyXG5cdFx0XHRcdGlmIF8uaXNTdHJpbmcgbWV0YUZpZWxkLm1ldGFcclxuXHRcdFx0XHRcdGZpbHRlciA9ICRmaWx0ZXIgbWV0YUZpZWxkLm1ldGFcclxuXHRcdFx0XHRcdGZvciBpbmRleCBpbiBbMC4udmFsdWUubGVuZ3RoIC0gMV1cclxuXHRcdFx0XHRcdFx0ZGF0YVtrZXldW2luZGV4XSA9IHJ1bkZpbHRlciBmaWx0ZXIsIHZhbHVlW2tleV0sIFwiI3tuZXdLZXlQYXRofVsje2luZGV4fV1cIiwgbWV0YUZpZWxkLnR5cGUsIG1ldGFGaWVsZC5vcHRpb25zXHJcblx0XHRcdFx0XHRcclxuXHRcdFx0XHRlbHNlIGlmIF8uaXNQbGFpbk9iamVjdCBtZXRhRmllbGQubWV0YVxyXG5cdFx0XHRcdFx0Zm9yIGluZGV4IGluIFswLi52YWx1ZS5sZW5ndGggLSAxXVxyXG5cdFx0XHRcdFx0XHRydW5JbXBsIG1ldGFGaWVsZC5tZXRhLCB2YWx1ZVtpbmRleF0sIGRhdGFba2V5XVtpbmRleF0gPz0ge30sIFwiI3tuZXdLZXlQYXRofVsje2luZGV4fV1cIiwgb3B0c1xyXG5cdFx0XHRcclxuXHRcdFx0XHRlbHNlXHJcblx0XHRcdFx0XHR0aHJvdyBuZXcgSW5wdXRFcnJvciBuZXdLZXlQYXRoLCAnYXJyYXknLCBcIkZpZWxkIGF0ICcje25ld0tleVBhdGh9JyBoYXMgYW4gaW52YWxpZCBkZXNjcmlwdG9yLlwiXHJcblx0XHRcdFxyXG5cdFx0ZWxzZVxyXG5cdFx0XHR0aHJvdyBuZXcgSW5wdXRFcnJvciBuZXdLZXlQYXRoLCAnaW52YWxpZCcsIFwiVW5zdXBwb3J0ZWQgZmlsdGVyIGRlc2NyaXB0b3IgYXQgJyN7bmV3S2V5UGF0aH0nOiAje21ldGFGaWVsZH1cIlxyXG5cclxuJGZpbHRlci5ydW4gPSAoZmlsdGVyLCBpbnB1dCwgb3B0cykgLT5cclxuXHRkYXRhID0ge31cclxuXHRydW5JbXBsIGZpbHRlciwgaW5wdXQsIGRhdGEsICcnLCBvcHRzXHJcblx0cmV0dXJuIGRhdGFcclxuXHJcbiRmaWx0ZXIubWlkZGxld2FyZSA9IChmaWx0ZXIpIC0+XHJcblx0KHJlcSwgcmVzLCBuZXh0KSAtPlxyXG5cdFx0dHJ5XHJcblx0XHRcdHJlcS5pbnB1dCA9ICRmaWx0ZXIucnVuIGZpbHRlciwgcmVxLmlucHV0XHJcblx0XHRcdG5leHQgbnVsbFxyXG5cdFx0Y2F0Y2ggZVxyXG5cdFx0XHRuZXh0IGVcclxuXHJcbnJlcXVpcmUoJy4vYnVpbHRpbicpICRmaWx0ZXJcclxubW9kdWxlLmV4cG9ydHMgPSAkZmlsdGVyXHJcbiJdfQ==
