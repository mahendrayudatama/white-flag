/*!
  jQuery Wookmark plugin
  @name jquery.wookmark.js
  @author Christoph Ono (chri@sto.ph or @gbks)
  @author Sebastian Helzle (sebastian@helzle.net or @sebobo)
  @version 1.2.3
  @date 6/14/2013
  @category jQuery plugin
  @copyright (c) 2009-2013 Christoph Ono (www.wookmark.com)
  @license Licensed under the MIT (http://www.opensource.org/licenses/mit-license.php) license.
*/
(function (factory) {
  if (typeof define === "function" && define.amd) define(["jquery"], factory);
  else factory(jQuery);
})(function ($) {
  var Wookmark, defaultOptions, __bind;

  __bind = function (fn, me) {
    return function () {
      return fn.apply(me, arguments);
    };
  };

  // Wookmark default options
  defaultOptions = {
    align: "center",
    container: $("body"),
    offset: 2,
    autoResize: false,
    itemWidth: 0,
    flexibleWidth: 0,
    resizeDelay: 50,
    onLayoutChanged: undefined,
  };

  Wookmark = (function (options) {
    function Wookmark(handler, options) {
      // Instance variables.
      this.handler = handler;
      this.columns = this.containerWidth = this.resizeTimer = null;
      this.activeItemCount = 0;
      this.direction = "left";
      this.itemHeightsDirty = true;

      $.extend(true, this, defaultOptions, options);

      // Bind instance methods
      this.update = __bind(this.update, this);
      this.onResize = __bind(this.onResize, this);
      this.onRefresh = __bind(this.onRefresh, this);
      this.getItemWidth = __bind(this.getItemWidth, this);
      this.layout = __bind(this.layout, this);
      this.layoutFull = __bind(this.layoutFull, this);
      this.layoutColumns = __bind(this.layoutColumns, this);
      this.filter = __bind(this.filter, this);
      this.clear = __bind(this.clear, this);
      this.getActiveItems = __bind(this.getActiveItems, this);

      // Collect filter data
      var i = (j = 0),
        filterClasses = {},
        itemFilterClasses;

      for (; i < handler.length; i++) {
        $item = handler.eq(i);

        // Read filter classes
        itemFilterClasses = $item.data("filterClass");

        // Globally store each filter class as object and the fitting items in the array
        if (
          typeof itemFilterClasses == "object" &&
          itemFilterClasses.length > 0
        ) {
          for (j = 0; j < itemFilterClasses.length; j++) {
            filterClass = $.trim(itemFilterClasses[j]).toLowerCase();

            if (!(filterClass in filterClasses)) {
              filterClasses[filterClass] = [];
            }
            filterClasses[filterClass].push($item[0]);
          }
        }
      }
      this.filterClasses = filterClasses;

      // Listen to resize event if requested.
      if (this.autoResize) {
        $(window).bind("resize.wookmark", this.onResize);
      }
      this.container.bind("refreshWookmark", this.onRefresh);
    }

    // Method for updating the plugins options
    Wookmark.prototype.update = function (options) {
      this.itemHeightsDirty = true;
      $.extend(true, this, options);
    };

    // This timer ensures that layout is not continuously called as window is being dragged.
    Wookmark.prototype.onResize = function () {
      clearTimeout(this.resizeTimer);
      this.itemHeightsDirty = this.flexibleWidth != 0;
      this.resizeTimer = setTimeout(this.layout, this.resizeDelay);
    };

    // Marks the items heights as dirty and does a relayout
    Wookmark.prototype.onRefresh = function () {
      this.itemHeightsDirty = true;
      this.layout();
    };

    /**
     * Filters the active items with the given string filters.
     * @param filters array of string
     * @param mode 'or' or 'and'
     */
    Wookmark.prototype.filter = function (filters, mode) {
      var activeFilters = [],
        activeFiltersLength,
        activeItems = $(),
        i,
        j,
        k,
        filter;

      filters = filters || [];
      mode = mode || "or";

      if (filters.length) {
        // Collect active filters
        for (i = 0; i < filters.length; i++) {
          filter = $.trim(filters[i].toLowerCase());
          if (filter in this.filterClasses) {
            activeFilters.push(this.filterClasses[filter]);
          }
        }

        // Get items for active filters with the selected mode
        activeFiltersLength = activeFilters.length;
        if (mode == "or" || activeFiltersLength == 1) {
          // Set all items in all active filters active
          for (i = 0; i < activeFiltersLength; i++) {
            activeItems = activeItems.add(activeFilters[i]);
          }
        } else if (mode == "and") {
          var shortestFilter = activeFilters[0],
            itemValid = true,
            foundInFilter,
            currentItem,
            currentFilter;

          // Find shortest filter class
          for (i = 1; i < activeFiltersLength; i++) {
            if (activeFilters[i].length < shortestFilter.length) {
              shortestFilter = activeFilters[i];
            }
          }

          // Iterate over shortest filter and find elements in other filter classes
          for (i = 0; i < shortestFilter.length; i++) {
            currentItem = shortestFilter[i];
            itemValid = true;

            for (j = 0; j < activeFilters.length && itemValid; j++) {
              currentFilter = activeFilters[j];
              if (shortestFilter == currentFilter) continue;

              // Search for current item in each active filter class
              for (
                k = 0, foundInFilter = false;
                k < currentFilter.length && !foundInFilter;
                k++
              ) {
                foundInFilter = currentFilter[k] == currentItem;
              }
              itemValid &= foundInFilter;
            }
            itemValid && activeItems.push(shortestFilter[i]);
          }
        }
        // Hide inactive items
        this.handler.not(activeItems).addClass("inactive");
      } else {
        // Show all items if no filter is selected
        activeItems = this.handler;
      }

      // Show active items
      activeItems.removeClass("inactive");

      // Unset columns and refresh grid for a full layout
      this.columns = null;
      this.layout();
    };

    // Method the get active items which are not disabled and visible
    Wookmark.prototype.getActiveItems = function () {
      return this.handler.not(".inactive");
    };

    // Method to get the standard item width
    Wookmark.prototype.getItemWidth = function () {
      var itemWidth = this.itemWidth,
        containerWidth = this.container.width(),
        firstElement = this.handler.eq(0),
        flexibleWidth = this.flexibleWidth;

      if (
        this.itemWidth === undefined ||
        (this.itemWidth === 0 && !this.flexibleWidth)
      ) {
        itemWidth = firstElement.outerWidth();
      } else if (
        typeof this.itemWidth == "string" &&
        this.itemWidth.indexOf("%") >= 0
      ) {
        itemWidth = (parseFloat(this.itemWidth) / 100) * containerWidth;
      }

      // Calculate flexible item width if option is set
      if (flexibleWidth) {
        if (
          typeof flexibleWidth == "string" &&
          flexibleWidth.indexOf("%") >= 0
        ) {
          flexibleWidth =
            (parseFloat(flexibleWidth) / 100) * containerWidth -
            firstElement.outerWidth() +
            firstElement.innerWidth();
        }

        var columns = ~~(1 + containerWidth / (flexibleWidth + this.offset)),
          columnWidth =
            (containerWidth - (columns - 1) * this.offset) / columns;

        itemWidth = Math.max(itemWidth, ~~columnWidth);

        // Stretch items to fill calculated width
        this.handler.css("width", itemWidth);
      }

      return itemWidth;
    };

    // Main layout method.
    Wookmark.prototype.layout = function () {
      // Do nothing if container isn't visible
      if (!this.container.is(":visible")) return;

      // Calculate basic layout parameters.
      var columnWidth = this.getItemWidth() + this.offset,
        containerWidth = this.container.width(),
        columns = ~~((containerWidth + this.offset) / columnWidth),
        offset = (maxHeight = i = 0),
        activeItems = this.getActiveItems(),
        activeItemsLength = activeItems.length,
        $item;

      // Cache item height
      if (this.itemHeightsDirty) {
        for (; i < activeItemsLength; i++) {
          $item = activeItems.eq(i);
          $item.data("outerHeight", $item.outerHeight());
        }
        this.itemHeightsDirty = false;
      }

      // Use less columns if there are to few items
      columns = Math.max(1, Math.min(columns, activeItemsLength));

      // Calculate the offset based on the alignment of columns to the parent container
      if (this.align == "left" || this.align == "right") {
        offset = ~~((columns / columnWidth + this.offset) >> 1);
      } else {
        offset = ~~(
          (0.5 + (containerWidth - (columns * columnWidth - this.offset))) >>
          1
        );
      }

      // Get direction for positioning
      this.direction = this.align == "right" ? "right" : "left";

      // If container and column count hasn't changed, we can only update the columns.
      if (
        this.columns != null &&
        this.columns.length == columns &&
        this.activeItemCount == activeItemsLength
      ) {
        maxHeight = this.layoutColumns(columnWidth, offset);
      } else {
        maxHeight = this.layoutFull(columnWidth, columns, offset);
      }
      this.activeItemCount = activeItemsLength;

      // Set container height to height of the grid.
      this.container.css("height", maxHeight);

      if (
        this.onLayoutChanged !== undefined &&
        typeof this.onLayoutChanged === "function"
      ) {
        this.onLayoutChanged();
      }
    };

    /**
     * Perform a full layout update.
     */
    Wookmark.prototype.layoutFull = function (columnWidth, columns, offset) {
      var item,
        top,
        left,
        i = 0,
        k = 0,
        j = 0,
        activeItems = this.getActiveItems(),
        length = activeItems.length,
        shortest = null,
        shortestIndex = null,
        itemCSS = { position: "absolute" },
        sideOffset,
        heights = [],
        leftAligned = this.align == "left" ? true : false;

      this.columns = [];

      // Prepare arrays to store height of columns and items.
      while (heights.length < columns) {
        heights.push(0);
        this.columns.push([]);
      }

      // Loop over items.
      for (; i < length; i++) {
        $item = activeItems.eq(i);

        // Find the shortest column.
        shortest = heights[0];
        shortestIndex = 0;
        for (k = 0; k < columns; k++) {
          if (heights[k] < shortest) {
            shortest = heights[k];
            shortestIndex = k;
          }
        }

        // stick to left side if alignment is left and this is the first column
        if (shortestIndex == 0 && leftAligned) {
          sideOffset = 0;
        } else {
          sideOffset = shortestIndex * columnWidth + offset;
        }

        // Position the item.
        itemCSS[this.direction] = sideOffset;
        itemCSS.top = shortest;
        $item.css(itemCSS);

        // Update column height and store item in shortest column
        heights[shortestIndex] += $item.data("outerHeight") + this.offset;
        this.columns[shortestIndex].push($item);
      }

      // Return longest column
      return Math.max.apply(Math, heights);
    };

    /**
     * This layout method only updates the vertical position of the
     * existing column assignments.
     */
    Wookmark.prototype.layoutColumns = function (columnWidth, offset) {
      var heights = [],
        i = 0,
        k = 0,
        column,
        item,
        itemCSS,
        sideOffset;

      for (; i < this.columns.length; i++) {
        heights.push(0);
        column = this.columns[i];
        sideOffset = i * columnWidth + offset;

        for (k = 0; k < column.length; k++) {
          $item = column[k];
          itemCSS = {
            top: heights[i],
          };
          itemCSS[this.direction] = sideOffset;

          $item.css(itemCSS);

          heights[i] += $item.data("outerHeight") + this.offset;
        }
      }

      // Return longest column
      return Math.max.apply(Math, heights);
    };

    /**
     * Clear event listeners and time outs.
     */
    Wookmark.prototype.clear = function () {
      clearTimeout(this.resizeTimer);
      $(window).unbind("resize.wookmark", this.onResize);
      this.container.unbind("refreshWookmark", this.onRefresh);
    };

    return Wookmark;
  })();

  $.fn.wookmark = function (options) {
    // Create a wookmark instance if not available
    if (!this.wookmarkInstance) {
      this.wookmarkInstance = new Wookmark(this, options || {});
    } else {
      this.wookmarkInstance.update(options || {});
    }

    // Apply layout
    this.wookmarkInstance.layout();

    // Display items (if hidden) and return jQuery object to maintain chainability
    return this.show();
  };
});
