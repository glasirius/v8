// Copyright 2017 the V8 project authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

"use strict"

function $(id) {
  return document.getElementById(id);
}

let components = [];

function createViews() {
  components.push(new CallTreeView());
  components.push(new TimelineView());
  components.push(new HelpView());

  let modeBar = $("mode-bar");

  function addMode(id, text, active) {
    let div = document.createElement("div");
    div.classList = "mode-button" + (active ? " active-mode-button" : "");
    div.id = "mode-" + id;
    div.textContent = text;
    div.onclick = () => {
      if (main.currentState.callTree.mode === id) return;
      let old = $("mode-" + main.currentState.callTree.mode);
      old.classList = "mode-button";
      div.classList = "mode-button active-mode-button";
      main.setMode(id);
    };
    modeBar.appendChild(div);
  }

  addMode("bottom-up", "Bottom up", true);
  addMode("top-down", "Top down");
  addMode("function-list", "Functions");

  main.setMode("bottom-up");
}

function emptyState() {
  return {
    file : null,
    start : 0,
    end : Infinity,
    timeLine : {
      width : 100,
      height : 100
    },
    callTree : {
      mode : "none",
      attribution : "js-exclude-bc",
      categories : "code-type",
      sort : "time"
    }
  };
}

function setCallTreeState(state, callTreeState) {
  state = Object.assign({}, state);
  state.callTree = callTreeState;
  return state;
}

let main = {
  currentState : emptyState(),

  setMode(mode) {
    if (mode != main.currentState.mode) {
      let callTreeState = Object.assign({}, main.currentState.callTree);
      callTreeState.mode = mode;
      switch (mode) {
        case "bottom-up":
          callTreeState.attribution = "js-exclude-bc";
          callTreeState.categories = "code-type";
          callTreeState.sort = "time";
          break;
        case "top-down":
          callTreeState.attribution = "js-exclude-bc";
          callTreeState.categories = "none";
          callTreeState.sort = "time";
          break;
        case "function-list":
          callTreeState.attribution = "js-exclude-bc";
          callTreeState.categories = "code-type";
          callTreeState.sort = "own-time";
          break;
        default:
          console.error("Invalid mode");
      }
      main.currentState = setCallTreeState(main.currentState,  callTreeState);
      main.delayRender();
    }
  },

  setCallTreeAttribution(attribution) {
    if (attribution != main.currentState.attribution) {
      let callTreeState = Object.assign({}, main.currentState.callTree);
      callTreeState.attribution = attribution;
      main.currentState = setCallTreeState(main.currentState,  callTreeState);
      main.delayRender();
    }
  },

  setCallTreeSort(sort) {
    if (sort != main.currentState.sort) {
      let callTreeState = Object.assign({}, main.currentState.callTree);
      callTreeState.sort = sort;
      main.currentState = setCallTreeState(main.currentState,  callTreeState);
      main.delayRender();
    }
  },

  setCallTreeCategories(categories) {
    if (categories != main.currentState.categories) {
      let callTreeState = Object.assign({}, main.currentState.callTree);
      callTreeState.categories = categories;
      main.currentState = setCallTreeState(main.currentState,  callTreeState);
      main.delayRender();
    }
  },

  setViewInterval(start, end) {
    if (start != main.currentState.start ||
        end != main.currentState.end) {
      main.currentState = Object.assign({}, main.currentState);
      main.currentState.start = start;
      main.currentState.end = end;
      main.delayRender();
    }
  },

  setTimeLineDimensions(width, height) {
    if (width != main.currentState.timeLine.width ||
        height != main.currentState.timeLine.height) {
      let timeLine = Object.assign({}, main.currentState.timeLine);
      timeLine.width = width;
      timeLine.height = height;
      main.currentState = Object.assign({}, main.currentState);
      main.currentState.timeLine = timeLine;
      main.delayRender();
    }
  },

  setFile(file) {
    if (file != main.currentState.file) {
      main.currentState = Object.assign({}, main.currentState);
      main.currentState.file = file;
      main.delayRender();
    }
  },

  setCurrentCode(codeId) {
    if (codeId != main.currentState.currentCodeId) {
      main.currentState = Object.assign({}, main.currentState);
      main.currentState.currentCodeId = codeId;
      main.delayRender();
    }
  },

  onResize() {
    main.setTimeLineDimensions(
      Math.round(window.innerWidth - 20),
      Math.round(window.innerHeight / 5));
  },

  onLoad() {
    function loadHandler(evt) {
      let f = evt.target.files[0];
      if (f) {
        let reader = new FileReader();
        reader.onload = function(event) {
          let profData = JSON.parse(event.target.result);
          main.setViewInterval(0, Infinity);
          main.setFile(profData);
        };
        reader.onerror = function(event) {
          console.error(
              "File could not be read! Code " + event.target.error.code);
        };
        reader.readAsText(f);
      } else {
        main.setFile(null);
      }
    }
    $("fileinput").addEventListener(
        "change", loadHandler, false);
    createViews();
    main.onResize();
  },

  delayRender()  {
    Promise.resolve().then(() => {
      for (let c of components) {
        c.render(main.currentState);
      }
    });
  }
};

let bucketDescriptors =
    [ { kinds : [ "JSOPT" ],
        color : "#ffb000",
        backgroundColor : "#ffe0c0",
        text : "JS Optimized" },
      { kinds : [ "JSUNOPT", "BC" ],
        color : "#00ff00",
        backgroundColor : "#c0ffc0",
        text : "JS Unoptimized" },
      { kinds : [ "IC" ],
        color : "#ffff00",
        backgroundColor : "#ffffc0",
        text : "IC" },
      { kinds : [ "STUB", "BUILTIN", "REGEXP" ],
        color : "#ffb0b0",
        backgroundColor : "#fff0f0",
        text : "Other generated" },
      { kinds : [ "CPP", "LIB" ],
        color : "#0000ff",
        backgroundColor : "#c0c0ff",
        text : "C++" },
      { kinds : [ "CPPEXT" ],
        color : "#8080ff",
        backgroundColor : "#e0e0ff",
        text : "C++/external" },
      { kinds : [ "CPPCOMP" ],
        color : "#00ffff",
        backgroundColor : "#c0ffff",
        text : "C++/Compiler" },
      { kinds : [ "CPPGC" ],
        color : "#ff00ff",
        backgroundColor : "#ffc0ff",
        text : "C++/GC" },
      { kinds : [ "UNKNOWN" ],
        color : "#f0f0f0",
        backgroundColor : "#e0e0e0",
        text : "Unknown" }
    ];

let kindToBucketDescriptor = {}
for (let i = 0; i < bucketDescriptors.length; i++) {
  let bucket = bucketDescriptors[i];
  for (let j = 0; j < bucket.kinds.length; j++) {
    kindToBucketDescriptor[bucket.kinds[j]] = bucket;
  }
}

function bucketFromKind(kind) {
  for (let i = 0; i < bucketDescriptors.length; i++) {
    let bucket = bucketDescriptors[i];
    for (let j = 0; j < bucket.kinds.length; j++) {
      if (bucket.kinds[j] === kind) {
        return bucket;
      }
    }
  }
  return null;
}

function codeTypeToText(type) {
  switch (type) {
    case "UNKNOWN":
      return "Unknown";
    case "CPPCOMP":
      return "C++ (compiler)";
    case "CPPGC":
      return "C++";
    case "CPPEXT":
      return "C++ External";
    case "CPP":
      return "C++";
    case "LIB":
      return "Library";
    case "IC":
      return "IC";
    case "BC":
      return "Bytecode";
    case "STUB":
      return "Stub";
    case "BUILTIN":
      return "Builtin";
    case "REGEXP":
      return "RegExp";
    case "JSOPT":
      return "JS opt";
    case "JSUNOPT":
      return "JS unopt";
  }
  console.error("Unknown type: " + type);
}

function createTypeDiv(type) {
  if (type === "CAT") {
    return document.createTextNode("");
  }
  let div = document.createElement("div");
  div.classList.add("code-type-chip");

  let span = document.createElement("span");
  span.classList.add("code-type-chip");
  span.textContent = codeTypeToText(type);
  div.appendChild(span);

  span = document.createElement("span");
  span.classList.add("code-type-chip-space");
  div.appendChild(span);

  return div;
}

function isBytecodeHandler(kind) {
  return kind === "BytecodeHandler";
}

function filterFromFilterId(id) {
  switch (id) {
    case "full-tree":
      return (type, kind) => true;
    case "js-funs":
      return (type, kind) => type !== 'CODE';
    case "js-exclude-bc":
      return (type, kind) =>
          type !== 'CODE' || !isBytecodeHandler(kind);
  }
}

class CallTreeView {
  constructor() {
    this.element = $("calltree");
    this.treeElement = $("calltree-table");
    this.selectAttribution = $("calltree-attribution");
    this.selectCategories = $("calltree-categories");
    this.selectSort = $("calltree-sort");

    this.selectAttribution.onchange = () => {
      main.setCallTreeAttribution(this.selectAttribution.value);
    };

    this.selectCategories.onchange = () => {
      main.setCallTreeCategories(this.selectCategories.value);
    };

    this.selectSort.onchange = () => {
      main.setCallTreeSort(this.selectSort.value);
    };

    this.currentState = null;
  }

  sortFromId(id) {
    switch (id) {
      case "time":
        return (c1, c2) => {
          if (c1.ticks < c2.ticks) return 1;
          else if (c1.ticks > c2.ticks) return -1;
          return c2.ownTicks - c1.ownTicks;
        }
      case "own-time":
        return (c1, c2) => {
          if (c1.ownTicks < c2.ownTicks) return 1;
          else if (c1.ownTicks > c2.ownTicks) return -1;
          return c2.ticks - c1.ticks;
        }
      case "category-time":
        return (c1, c2) => {
          if (c1.type === c2.type) return c2.ticks - c1.ticks;
          if (c1.type < c2.type) return 1;
          return -1;
        };
      case "category-own-time":
        return (c1, c2) => {
          if (c1.type === c2.type) return c2.ownTicks - c1.ownTicks;
          if (c1.type < c2.type) return 1;
          return -1;
        };
    }
  }

  createExpander(indent) {
    let div = document.createElement("div");
    div.style.width = (1 + indent) + "em";
    div.style.display = "inline-block";
    div.style.textAlign = "right";
    return div;
  }

  createFunctionNode(name, codeId) {
    if (codeId == -1) {
      return document.createTextNode(name);
    }
    let nameElement = document.createElement("span");
    nameElement.classList.add("codeid-link")
    nameElement.onclick = function() {
      main.setCurrentCode(codeId);
    };
    nameElement.appendChild(document.createTextNode(name));
    return nameElement;
  }

  expandTree(tree, indent) {
    let that = this;
    let index = 0;
    let id = "R/";
    let row = tree.row;
    let expander = tree.expander;

    if (row) {
      console.assert("expander");
      index = row.rowIndex;
      id = row.id;

      // Make sure we collapse the children when the row is clicked
      // again.
      expander.textContent = "\u25BE";
      let expandHandler = expander.onclick;
      expander.onclick = () => {
        that.collapseRow(tree, expander, expandHandler);
      }
    }

    // Collect the children, and sort them by ticks.
    let children = [];
    let filter =
        filterFromFilterId(this.currentState.callTree.attribution);
    for (let childId in tree.children) {
      let child = tree.children[childId];
      if (child.ticks > 0) {
        children.push(child);
        if (child.delayedExpansion) {
          expandTreeNode(this.currentState.file, child, filter);
        }
      }
    }
    children.sort(this.sortFromId(this.currentState.callTree.sort));

    for (let i = 0; i < children.length; i++) {
      let node = children[i];
      let row = this.rows.insertRow(index);
      row.id = id + i + "/";

      if (node.type != "CAT") {
        row.style.backgroundColor = bucketFromKind(node.type).backgroundColor;
      }

      // Inclusive time % cell.
      let c = row.insertCell();
      c.textContent = (node.ticks * 100 / this.tickCount).toFixed(2) + "%";
      c.style.textAlign = "right";
      // Percent-of-parent cell.
      c = row.insertCell();
      c.textContent = (node.ticks * 100 / tree.ticks).toFixed(2) + "%";
      c.style.textAlign = "right";
      // Exclusive time % cell.
      if (this.currentState.callTree.mode !== "bottom-up") {
        c = row.insertCell(-1);
        c.textContent = (node.ownTicks * 100 / this.tickCount).toFixed(2) + "%";
        c.style.textAlign = "right";
      }

      // Create the name cell.
      let nameCell = row.insertCell();
      let expander = this.createExpander(indent);
      nameCell.appendChild(expander);
      nameCell.appendChild(createTypeDiv(node.type));
      nameCell.appendChild(this.createFunctionNode(node.name, node.codeId));

      // Inclusive ticks cell.
      c = row.insertCell();
      c.textContent = node.ticks;
      c.style.textAlign = "right";
      if (this.currentState.callTree.mode !== "bottom-up") {
        // Exclusive ticks cell.
        c = row.insertCell(-1);
        c.textContent = node.ownTicks;
        c.style.textAlign = "right";
      }
      if (node.children.length > 0) {
        expander.textContent = "\u25B8";
        expander.onclick = () => { that.expandTree(node, indent + 1); };
      }

      node.row = row;
      node.expander = expander;

      index++;
    }
  }

  collapseRow(tree, expander, expandHandler) {
    let row = tree.row;
    let id = row.id;
    let index = row.rowIndex;
    while (row.rowIndex < this.rows.rows.length &&
        this.rows.rows[index].id.startsWith(id)) {
      this.rows.deleteRow(index);
    }

    expander.textContent = "\u25B8";
    expander.onclick = expandHandler;
  }

  fillSelects(calltree) {
    function addOptions(e, values, current) {
      while (e.options.length > 0) {
        e.remove(0);
      }
      for (let i = 0; i < values.length; i++) {
        let option = document.createElement("option");
        option.value = values[i].value;
        option.textContent = values[i].text;
        e.appendChild(option);
      }
      e.value = current;
    }

    let attributions = [
        { value : "js-exclude-bc",
          text : "Attribute bytecode handlers to caller" },
        { value : "full-tree",
          text : "Count each code object separately" },
        { value : "js-funs",
          text : "Attribute non-functions to JS functions"  }
    ];

    switch (calltree.mode) {
      case "bottom-up":
        addOptions(this.selectAttribution, attributions, calltree.attribution);
        addOptions(this.selectCategories, [
            { value : "code-type", text : "Code type" },
            { value : "none", text : "None" }
        ], calltree.categories);
        addOptions(this.selectSort, [
            { value : "time", text : "Time (including children)" },
            { value : "category-time", text : "Code category, time" },
        ], calltree.sort);
        return;
      case "top-down":
        addOptions(this.selectAttribution, attributions, calltree.attribution);
        addOptions(this.selectCategories, [
            { value : "none", text : "None" }
        ], calltree.categories);
        addOptions(this.selectSort, [
            { value : "time", text : "Time (including children)" },
            { value : "own-time", text : "Own time" },
            { value : "category-time", text : "Code category, time" },
            { value : "category-own-time", text : "Code category, own time"}
        ], calltree.sort);
        return;
      case "function-list":
        addOptions(this.selectAttribution, attributions, calltree.attribution);
        addOptions(this.selectCategories, [
            { value : "code-type", text : "Code type" },
            { value : "none", text : "None" }
        ], calltree.categories);
        addOptions(this.selectSort, [
            { value : "own-time", text : "Own time" },
            { value : "time", text : "Time (including children)" },
            { value : "category-own-time", text : "Code category, own time"},
            { value : "category-time", text : "Code category, time" },
        ], calltree.sort);
        return;
    }
    console.error("Unexpected mode");
  }

  render(newState) {
    let oldState = this.currentState;
    if (!newState.file) {
      this.element.style.display = "none";
      return;
    }

    this.currentState = newState;
    if (oldState) {
      if (newState.file === oldState.file &&
          newState.start === oldState.start &&
          newState.end === oldState.end &&
          newState.callTree.mode === oldState.callTree.mode &&
          newState.callTree.attribution === oldState.callTree.attribution &&
          newState.callTree.categories === oldState.callTree.categories &&
          newState.callTree.sort === oldState.callTree.sort) {
        // No change => just return.
        return;
      }
    }

    this.element.style.display = "inherit";

    let mode = this.currentState.callTree.mode;
    if (!oldState || mode !== oldState.callTree.mode) {
      // Technically, we should also call this if attribution, categories or
      // sort change, but the selection is already highlighted by the combobox
      // itself, so we do need to do anything here.
      this.fillSelects(newState.callTree);
    }

    let ownTimeClass = (mode === "bottom-up") ? "numeric-hidden" : "numeric";
    let ownTimeTh = $(this.treeElement.id + "-own-time-header");
    ownTimeTh.classList = ownTimeClass;
    let ownTicksTh = $(this.treeElement.id + "-own-ticks-header");
    ownTicksTh.classList = ownTimeClass;

    // Build the tree.
    let stackProcessor;
    let filter = filterFromFilterId(this.currentState.callTree.attribution);
    if (mode === "top-down") {
      stackProcessor =
          new PlainCallTreeProcessor(filter, false);
    } else if (mode === "function-list") {
      stackProcessor = new FunctionListTree(
          filter, this.currentState.callTree.categories === "code-type");

    } else {
      console.assert(mode === "bottom-up");
      if (this.currentState.callTree.categories == "none") {
        stackProcessor =
            new PlainCallTreeProcessor(filter, true);
      } else {
        console.assert(this.currentState.callTree.categories === "code-type");
        stackProcessor =
            new CategorizedCallTreeProcessor(filter, true);
      }
    }
    this.tickCount =
        generateTree(this.currentState.file,
                     this.currentState.start,
                     this.currentState.end,
                     stackProcessor);
    // TODO(jarin) Handle the case when tick count is negative.

    this.tree = stackProcessor.tree;

    // Remove old content of the table, replace with new one.
    let oldRows = this.treeElement.getElementsByTagName("tbody");
    let newRows = document.createElement("tbody");
    this.rows = newRows;

    // Populate the table.
    this.expandTree(this.tree, 0);

    // Swap in the new rows.
    this.treeElement.replaceChild(newRows, oldRows[0]);
  }
}

class TimelineView {
  constructor() {
    this.element = $("timeline");
    this.canvas = $("timeline-canvas");
    this.legend = $("timeline-legend");
    this.currentCode = $("timeline-currentCode");

    this.canvas.onmousedown = this.onMouseDown.bind(this);
    this.canvas.onmouseup = this.onMouseUp.bind(this);
    this.canvas.onmousemove = this.onMouseMove.bind(this);

    this.selectionStart = null;
    this.selectionEnd = null;
    this.selecting = false;

    this.fontSize = 12;
    this.imageOffset = Math.round(this.fontSize * 1.2);
    this.functionTimelineHeight = 16;

    this.currentState = null;
  }

  onMouseDown(e) {
    this.selectionStart =
        e.clientX - this.canvas.getBoundingClientRect().left;
    this.selectionEnd = this.selectionStart + 1;
    this.selecting = true;
  }

  onMouseMove(e) {
    if (this.selecting) {
      this.selectionEnd =
          e.clientX - this.canvas.getBoundingClientRect().left;
      this.drawSelection();
    }
  }

  onMouseUp(e) {
    if (this.selectionStart !== null) {
      let x = e.clientX - this.canvas.getBoundingClientRect().left;
      if (Math.abs(x - this.selectionStart) < 10) {
        this.selectionStart = null;
        this.selectionEnd = null;
        let ctx = this.canvas.getContext("2d");
        ctx.drawImage(this.buffer, 0, this.imageOffset);
      } else {
        this.selectionEnd = x;
        this.drawSelection();
      }
      let file = this.currentState.file;
      if (file) {
        let start = this.selectionStart === null ? 0 : this.selectionStart;
        let end = this.selectionEnd === null ? Infinity : this.selectionEnd;
        let firstTime = file.ticks[0].tm;
        let lastTime = file.ticks[file.ticks.length - 1].tm;

        let width = this.buffer.width;

        start = (start / width) * (lastTime - firstTime) + firstTime;
        end = (end / width) * (lastTime - firstTime) + firstTime;

        if (end < start) {
          let temp = start;
          start = end;
          end = temp;
        }

        main.setViewInterval(start, end);
      }
    }
    this.selecting = false;
  }

  drawSelection() {
    let ctx = this.canvas.getContext("2d");

    // Draw the timeline image.
    ctx.drawImage(this.buffer, 0, this.imageOffset);

    // Draw the current interval highlight.
    let left;
    let right;
    if (this.selectionStart !== null && this.selectionEnd !== null) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
      left = Math.min(this.selectionStart, this.selectionEnd);
      right = Math.max(this.selectionStart, this.selectionEnd);
      let height = this.buffer.height - this.functionTimelineHeight;
      ctx.fillRect(0, this.imageOffset, left, height);
      ctx.fillRect(right, this.imageOffset, this.buffer.width - right, height);
    } else {
      left = 0;
      right = this.buffer.width;
    }

    // Draw the scale text.
    let file = this.currentState.file;
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, this.canvas.width, this.imageOffset);
    if (file && file.ticks.length > 0) {
      let firstTime = file.ticks[0].tm;
      let lastTime = file.ticks[file.ticks.length - 1].tm;

      let leftTime =
          firstTime + left / this.canvas.width * (lastTime - firstTime);
      let rightTime =
          firstTime + right / this.canvas.width * (lastTime - firstTime);

      let leftText = (leftTime / 1000000).toFixed(3) + "s";
      let rightText = (rightTime / 1000000).toFixed(3) + "s";

      ctx.textBaseline = 'top';
      ctx.font = this.fontSize + "px Arial";
      ctx.fillStyle = "black";

      let leftWidth = ctx.measureText(leftText).width;
      let rightWidth = ctx.measureText(rightText).width;

      let leftStart = left - leftWidth / 2;
      let rightStart = right - rightWidth / 2;

      if (leftStart < 0) leftStart = 0;
      if (rightStart + rightWidth > this.canvas.width) {
        rightStart = this.canvas.width - rightWidth;
      }
      if (leftStart + leftWidth > rightStart) {
        if (leftStart > this.canvas.width - (rightStart - rightWidth)) {
          rightStart = leftStart + leftWidth;

        } else {
          leftStart = rightStart - leftWidth;
        }
      }

      ctx.fillText(leftText, leftStart, 0);
      ctx.fillText(rightText, rightStart, 0);
    }
  }

  render(newState) {
    let oldState = this.currentState;

    if (!newState.file) {
      this.element.style.display = "none";
      return;
    }

    this.currentState = newState;
    if (oldState) {
      if (newState.timeLine.width === oldState.timeLine.width &&
          newState.timeLine.height === oldState.timeLine.height &&
          newState.file === oldState.file &&
          newState.currentCodeId === oldState.currentCodeId &&
          newState.start === oldState.start &&
          newState.end === oldState.end) {
        // No change, nothing to do.
        return;
      }
    }

    this.element.style.display = "inherit";

    // Make sure the canvas has the right dimensions.
    let width = this.currentState.timeLine.width;
    let height = this.currentState.timeLine.height;
    this.canvas.width = width;
    this.canvas.height  = height;

    // Make space for the selection text.
    height -= this.imageOffset;

    let file = this.currentState.file;
    if (!file) return;

    let currentCodeId = this.currentState.currentCodeId;

    let firstTime = file.ticks[0].tm;
    let lastTime = file.ticks[file.ticks.length - 1].tm;
    let start = Math.max(this.currentState.start, firstTime);
    let end = Math.min(this.currentState.end, lastTime);

    this.selectionStart = (start - firstTime) / (lastTime - firstTime) * width;
    this.selectionEnd = (end - firstTime) / (lastTime - firstTime) * width;

    let tickCount = file.ticks.length;

    let minBucketPixels = 10;
    let minBucketSamples = 30;
    let bucketCount = Math.min(width / minBucketPixels,
                               tickCount / minBucketSamples);

    let stackProcessor = new CategorySampler(file, bucketCount);
    generateTree(file, 0, Infinity, stackProcessor);
    let codeIdProcessor = new FunctionTimelineProcessor(
      currentCodeId,
      filterFromFilterId(this.currentState.callTree.attribution));
    generateTree(file, 0, Infinity, codeIdProcessor);

    let buffer = document.createElement("canvas");

    buffer.width = width;
    buffer.height = height;

    // Calculate the bar heights for each bucket.
    let graphHeight = height - this.functionTimelineHeight;
    let buckets = stackProcessor.buckets;
    let bucketsGraph = [];
    for (let i = 0; i < buckets.length; i++) {
      let sum = 0;
      let bucketData = [];
      let total = buckets[i].total;
      for (let j = 0; j < bucketDescriptors.length; j++) {
        let desc = bucketDescriptors[j];
        for (let k = 0; k < desc.kinds.length; k++) {
          sum += buckets[i][desc.kinds[k]];
        }
        bucketData.push(Math.round(graphHeight * sum / total));
      }
      bucketsGraph.push(bucketData);
    }

    // Draw the graph into the buffer.
    let bucketWidth = width / (bucketsGraph.length - 1);
    let ctx = buffer.getContext('2d');
    for (let i = 0; i < bucketsGraph.length - 1; i++) {
      let bucketData = bucketsGraph[i];
      let nextBucketData = bucketsGraph[i + 1];
      for (let j = 0; j < bucketData.length; j++) {
        let x1 = Math.round(i * bucketWidth);
        let x2 = Math.round((i + 1) * bucketWidth);
        ctx.beginPath();
        ctx.moveTo(x1, j && bucketData[j - 1]);
        ctx.lineTo(x2, j && nextBucketData[j - 1]);
        ctx.lineTo(x2, nextBucketData[j]);
        ctx.lineTo(x1, bucketData[j]);
        ctx.closePath();
        ctx.fillStyle = bucketDescriptors[j].color;
        ctx.fill();
      }
    }
    let functionTimelineYOffset = graphHeight;
    let functionTimelineHeight = this.functionTimelineHeight;
    let functionTimelineHalfHeight = Math.round(functionTimelineHeight / 2);
    let timestampScaler = width / (lastTime - firstTime);
    ctx.fillStyle = "white";
    ctx.fillRect(
      0,
      functionTimelineYOffset,
      buffer.width,
      functionTimelineHeight);
    for (let i = 0; i < codeIdProcessor.blocks.length; i++) {
      let block = codeIdProcessor.blocks[i];
      let bucket = kindToBucketDescriptor[block.kind];
      ctx.fillStyle = bucket.color;
      ctx.fillRect(
        Math.round((block.start - firstTime) * timestampScaler),
        functionTimelineYOffset,
        Math.max(1, Math.round((block.end - block.start) * timestampScaler)),
        block.topOfStack ? functionTimelineHeight : functionTimelineHalfHeight);
    }
    ctx.strokeStyle = "black";
    ctx.lineWidth = "1";
    ctx.beginPath();
    ctx.moveTo(0, functionTimelineYOffset + 0.5);
    ctx.lineTo(buffer.width, functionTimelineYOffset + 0.5);
    ctx.stroke();
    ctx.strokeStyle = "rgba(0,0,0,0.2)";
    ctx.lineWidth = "1";
    ctx.beginPath();
    ctx.moveTo(0, functionTimelineYOffset + functionTimelineHalfHeight - 0.5);
    ctx.lineTo(buffer.width,
        functionTimelineYOffset + functionTimelineHalfHeight - 0.5);
    ctx.stroke();

    // Remember stuff for later.
    this.buffer = buffer;

    // Draw the buffer.
    this.drawSelection();

    // (Re-)Populate the graph legend.
    while (this.legend.cells.length > 0) {
      this.legend.deleteCell(0);
    }
    let cell = this.legend.insertCell(-1);
    cell.textContent = "Legend: ";
    cell.style.padding = "1ex";
    for (let i = 0; i < bucketDescriptors.length; i++) {
      let cell = this.legend.insertCell(-1);
      cell.style.padding = "1ex";
      let desc = bucketDescriptors[i];
      let div = document.createElement("div");
      div.style.display = "inline-block";
      div.style.width = "0.6em";
      div.style.height = "1.2ex";
      div.style.backgroundColor = desc.color;
      div.style.borderStyle = "solid";
      div.style.borderWidth = "1px";
      div.style.borderColor = "Black";
      cell.appendChild(div);
      cell.appendChild(document.createTextNode(" " + desc.text));
    }

    while (this.currentCode.firstChild) {
      this.currentCode.removeChild(this.currentCode.firstChild);
    }
    if (currentCodeId) {
      let currentCode = file.code[currentCodeId];
      this.currentCode.appendChild(document.createTextNode(currentCode.name));
    } else {
      this.currentCode.appendChild(document.createTextNode("<none>"));
    }
  }
}

class HelpView {
  constructor() {
    this.element = $("help");
  }

  render(newState) {
    this.element.style.display = newState.file ? "none" : "inherit";
  }
}
