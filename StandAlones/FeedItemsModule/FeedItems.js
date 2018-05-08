/* This software is licensed under a BSD license; see the LICENSE file for details. */

//  ========================================= 
//
//      FEED ITEMS
//
//  This is a stand-alone version of the 
//  PennController.FeedItems method.
//  Use it to generate items from a table
//  after converting your CSV file using:
//  http://spellout.net/ibexexps/PennController/GetTable/
//
//  =========================================

var items;
var PennController;

if (PennController == undefined)
    PennController = {};


// The main function
// FeedItems(new Table(...),                       // Optional, or reference to a Table object
//     (row) => PennController(                 // Or () => ["Message", {...}, "PennController", PennController(...)]
//         p(row.text)
//         ,
//         p(row.image)
//         ,
//         p.key("FJ")
// )    
//
// or (assuming a default table)
//
// FeedItems(
//     (row) => PennController(                 // Or () => ["Message", {...}, "PennController", PennController(...)]
//         p(row.text)
//         ,
//         p(row.image)
//         ,
//         p.key("FJ")
// )    
FeedItems = function (param1, param2) {

    // ====     INTERNAL FUNCTIONS      ====
    //

    // The jQuery-CSV mini plugin
    // Under MIT License
    // https://github.com/evanplaice/jquery-csv
    function _loadjQueryCSV() {
        RegExp.escape=function(r){return r.replace(/[-\/\\^$*+?.()|[\]{}]/g,"\\$&")},function(){"use strict";var r;(r="undefined"!=typeof jQuery&&jQuery?jQuery:{}).csv={defaults:{separator:",",delimiter:'"',headers:!0},hooks:{castToScalar:function(r,e){if(isNaN(r))return r;if(/\./.test(r))return parseFloat(r);var a=parseInt(r);return isNaN(a)?null:a}},parsers:{parse:function(r,e){var a=e.separator,t=e.delimiter;e.state.rowNum||(e.state.rowNum=1),e.state.colNum||(e.state.colNum=1);var s=[],o=[],n=0,i="",l=!1;function c(){if(n=0,i="",e.start&&e.state.rowNum<e.start)return o=[],e.state.rowNum++,void(e.state.colNum=1);if(void 0===e.onParseEntry)s.push(o);else{var r=e.onParseEntry(o,e.state);!1!==r&&s.push(r)}o=[],e.end&&e.state.rowNum>=e.end&&(l=!0),e.state.rowNum++,e.state.colNum=1}function u(){if(void 0===e.onParseValue)o.push(i);else{var r=e.onParseValue(i,e.state);!1!==r&&o.push(r)}i="",n=0,e.state.colNum++}var f=RegExp.escape(a),d=RegExp.escape(t),m=/(D|S|\r\n|\n|\r|[^DS\r\n]+)/,p=m.source;return p=(p=p.replace(/S/g,f)).replace(/D/g,d),m=new RegExp(p,"gm"),r.replace(m,function(r){if(!l)switch(n){case 0:if(r===a){i+="",u();break}if(r===t){n=1;break}if(/^(\r\n|\n|\r)$/.test(r)){u(),c();break}i+=r,n=3;break;case 1:if(r===t){n=2;break}i+=r,n=1;break;case 2:if(r===t){i+=r,n=1;break}if(r===a){u();break}if(/^(\r\n|\n|\r)$/.test(r)){u(),c();break}throw new Error("CSVDataError: Illegal State [Row:"+e.state.rowNum+"][Col:"+e.state.colNum+"]");case 3:if(r===a){u();break}if(/^(\r\n|\n|\r)$/.test(r)){u(),c();break}if(r===t)throw new Error("CSVDataError: Illegal Quote [Row:"+e.state.rowNum+"][Col:"+e.state.colNum+"]");throw new Error("CSVDataError: Illegal Data [Row:"+e.state.rowNum+"][Col:"+e.state.colNum+"]");default:throw new Error("CSVDataError: Unknown State [Row:"+e.state.rowNum+"][Col:"+e.state.colNum+"]")}}),0!==o.length&&(u(),c()),s},splitLines:function(e,a){if(e){var t=(a=a||{}).separator||r.csv.defaults.separator,s=a.delimiter||r.csv.defaults.delimiter;a.state=a.state||{},a.state.rowNum||(a.state.rowNum=1);var o=[],n=0,i="",l=!1,c=RegExp.escape(t),u=RegExp.escape(s),f=/(D|S|\n|\r|[^DS\r\n]+)/,d=f.source;return d=(d=d.replace(/S/g,c)).replace(/D/g,u),f=new RegExp(d,"gm"),e.replace(f,function(r){if(!l)switch(n){case 0:if(r===t){i+=r,n=0;break}if(r===s){i+=r,n=1;break}if("\n"===r){m();break}if(/^\r$/.test(r))break;i+=r,n=3;break;case 1:if(r===s){i+=r,n=2;break}i+=r,n=1;break;case 2:var e=i.substr(i.length-1);if(r===s&&e===s){i+=r,n=1;break}if(r===t){i+=r,n=0;break}if("\n"===r){m();break}if("\r"===r)break;throw new Error("CSVDataError: Illegal state [Row:"+a.state.rowNum+"]");case 3:if(r===t){i+=r,n=0;break}if("\n"===r){m();break}if("\r"===r)break;if(r===s)throw new Error("CSVDataError: Illegal quote [Row:"+a.state.rowNum+"]");throw new Error("CSVDataError: Illegal state [Row:"+a.state.rowNum+"]");default:throw new Error("CSVDataError: Unknown state [Row:"+a.state.rowNum+"]")}}),""!==i&&m(),o}function m(){if(n=0,a.start&&a.state.rowNum<a.start)return i="",void a.state.rowNum++;if(void 0===a.onParseEntry)o.push(i);else{var r=a.onParseEntry(i,a.state);!1!==r&&o.push(r)}i="",a.end&&a.state.rowNum>=a.end&&(l=!0),a.state.rowNum++}},parseEntry:function(r,e){var a=e.separator,t=e.delimiter;e.state.rowNum||(e.state.rowNum=1),e.state.colNum||(e.state.colNum=1);var s=[],o=0,n="";function i(){if(void 0===e.onParseValue)s.push(n);else{var r=e.onParseValue(n,e.state);!1!==r&&s.push(r)}n="",o=0,e.state.colNum++}if(!e.match){var l=RegExp.escape(a),c=RegExp.escape(t),u=/(D|S|\n|\r|[^DS\r\n]+)/.source;u=(u=u.replace(/S/g,l)).replace(/D/g,c),e.match=new RegExp(u,"gm")}return r.replace(e.match,function(r){switch(o){case 0:if(r===a){n+="",i();break}if(r===t){o=1;break}if("\n"===r||"\r"===r)break;n+=r,o=3;break;case 1:if(r===t){o=2;break}n+=r,o=1;break;case 2:if(r===t){n+=r,o=1;break}if(r===a){i();break}if("\n"===r||"\r"===r)break;throw new Error("CSVDataError: Illegal State [Row:"+e.state.rowNum+"][Col:"+e.state.colNum+"]");case 3:if(r===a){i();break}if("\n"===r||"\r"===r)break;if(r===t)throw new Error("CSVDataError: Illegal Quote [Row:"+e.state.rowNum+"][Col:"+e.state.colNum+"]");throw new Error("CSVDataError: Illegal Data [Row:"+e.state.rowNum+"][Col:"+e.state.colNum+"]");default:throw new Error("CSVDataError: Unknown State [Row:"+e.state.rowNum+"][Col:"+e.state.colNum+"]")}}),i(),s}},helpers:{collectPropertyNames:function(r){var e=[],a=[],t=[];for(e in r)for(a in r[e])r[e].hasOwnProperty(a)&&t.indexOf(a)<0&&"function"!=typeof r[e][a]&&t.push(a);return t}},toArray:function(e,a,t){a=void 0!==a?a:{};var s={};s.callback=void 0!==t&&"function"==typeof t&&t,s.separator="separator"in a?a.separator:r.csv.defaults.separator,s.delimiter="delimiter"in a?a.delimiter:r.csv.defaults.delimiter;var o=void 0!==a.state?a.state:{};a={delimiter:s.delimiter,separator:s.separator,onParseEntry:a.onParseEntry,onParseValue:a.onParseValue,state:o};var n=r.csv.parsers.parseEntry(e,a);if(!s.callback)return n;s.callback("",n)},toArrays:function(e,a,t){a=void 0!==a?a:{};var s={};s.callback=void 0!==t&&"function"==typeof t&&t,s.separator="separator"in a?a.separator:r.csv.defaults.separator,s.delimiter="delimiter"in a?a.delimiter:r.csv.defaults.delimiter;var o;if(void 0!==(a={delimiter:s.delimiter,separator:s.separator,onPreParse:a.onPreParse,onParseEntry:a.onParseEntry,onParseValue:a.onParseValue,onPostParse:a.onPostParse,start:a.start,end:a.end,state:{rowNum:1,colNum:1}}).onPreParse&&a.onPreParse(e,a.state),o=r.csv.parsers.parse(e,a),void 0!==a.onPostParse&&a.onPostParse(o,a.state),!s.callback)return o;s.callback("",o)},toObjects:function(e,a,t){a=void 0!==a?a:{};var s={};s.callback=void 0!==t&&"function"==typeof t&&t,s.separator="separator"in a?a.separator:r.csv.defaults.separator,s.delimiter="delimiter"in a?a.delimiter:r.csv.defaults.delimiter,s.headers="headers"in a?a.headers:r.csv.defaults.headers,a.start="start"in a?a.start:1,s.headers&&a.start++,a.end&&s.headers&&a.end++;var o,n=[];a={delimiter:s.delimiter,separator:s.separator,onPreParse:a.onPreParse,onParseEntry:a.onParseEntry,onParseValue:a.onParseValue,onPostParse:a.onPostParse,start:a.start,end:a.end,state:{rowNum:1,colNum:1},match:!1,transform:a.transform};var i={delimiter:s.delimiter,separator:s.separator,start:1,end:1,state:{rowNum:1,colNum:1}};void 0!==a.onPreParse&&a.onPreParse(e,a.state);var l=r.csv.parsers.splitLines(e,i),c=r.csv.toArray(l[0],a);o=r.csv.parsers.splitLines(e,a),a.state.colNum=1,a.state.rowNum=c?2:1;for(var u=0,f=o.length;u<f;u++){for(var d=r.csv.toArray(o[u],a),m={},p=0;p<c.length;p++)m[c[p]]=d[p];void 0!==a.transform?n.push(a.transform.call(void 0,m)):n.push(m),a.state.rowNum++}if(void 0!==a.onPostParse&&a.onPostParse(n,a.state),!s.callback)return n;s.callback("",n)},fromArrays:function(e,a,t){a=void 0!==a?a:{};var s={};s.callback=void 0!==t&&"function"==typeof t&&t,s.separator="separator"in a?a.separator:r.csv.defaults.separator,s.delimiter="delimiter"in a?a.delimiter:r.csv.defaults.delimiter;var o,n,i,l,c="";for(i=0;i<e.length;i++){for(o=e[i],n=[],l=0;l<o.length;l++){var u=void 0===o[l]||null===o[l]?"":o[l].toString();u.indexOf(s.delimiter)>-1&&(u=u.replace(new RegExp(s.delimiter,"g"),s.delimiter+s.delimiter));var f="\n|\r|S|D";f=(f=f.replace("S",s.separator)).replace("D",s.delimiter),u.search(f)>-1&&(u=s.delimiter+u+s.delimiter),n.push(u)}c+=n.join(s.separator)+"\r\n"}if(!s.callback)return c;s.callback("",c)},fromObjects:function(e,a,t){a=void 0!==a?a:{};var s={};if(s.callback=void 0!==t&&"function"==typeof t&&t,s.separator="separator"in a?a.separator:r.csv.defaults.separator,s.delimiter="delimiter"in a?a.delimiter:r.csv.defaults.delimiter,s.headers="headers"in a?a.headers:r.csv.defaults.headers,s.sortOrder="sortOrder"in a?a.sortOrder:"declare",s.manualOrder="manualOrder"in a?a.manualOrder:[],s.transform=a.transform,"string"==typeof s.manualOrder&&(s.manualOrder=r.csv.toArray(s.manualOrder,s)),void 0!==s.transform){var o,n=e;for(e=[],o=0;o<n.length;o++)e.push(s.transform.call(void 0,n[o]))}var i=r.csv.helpers.collectPropertyNames(e);if("alpha"===s.sortOrder&&i.sort(),s.manualOrder.length>0){var l=[].concat(s.manualOrder);for(u=0;u<i.length;u++)l.indexOf(i[u])<0&&l.push(i[u]);i=l}var c,u,f,d,m=[];for(s.headers&&m.push(i),c=0;c<e.length;c++){for(f=[],u=0;u<i.length;u++)(d=i[u])in e[c]&&"function"!=typeof e[c][d]?f.push(e[c][d]):f.push("");m.push(f)}return r.csv.fromArrays(m,a,s.callback)}},r.csvEntry2Array=r.csv.toArray,r.csv2Array=r.csv.toArrays,r.csv2Dictionary=r.csv.toObjects,"undefined"!=typeof module&&module.exports&&(module.exports=r.csv)}.call(this);
    }

    // Looks for a CSV file defining a datasource in chunk_includes
    function _smartTableDetection() {
        function _checkTable(table){
            // Load the jQuery-CSV plugin
            if (!$.csv)
                _loadjQueryCSV();
            table = $.csv.toObjects(table);
            // Checking that there is more than one column
            if (Object.keys(table[0]).length > 1)
                return table;
            // If it didn't work with comma as the default separator, try with tab
            table = $.csv.toObjects(CHUNKS_DICT[entry], {separator: "\t"});
            if (Object.keys(table[0]).length > 1)
                return table;
            return null;
        }
        // A default table was defined
        if (PennController.hasOwnProperty("defaultTable")) {
            let table = _checkTable(PennController.defaultTable);
            if (table)
                return table;
        }
        // No default table, look up CHUNKS_DICT
        for (let entry in CHUNKS_DICT) {
            if (entry.match(/\.(html?|mp3)$/i))
                continue;
            let table = _checkTable(CHUNKS_DICT[entry]);
            if (table)
                return table;
            
        }
        // If nothing worked, return Abort
        return;
    }        

    // This is the function that actually creates the list of items
    function _getItemsFrom(table, pennfunc) {
        // Building the items
        let items = [];
        let groups = {};
        // Going through the table
        for (row in table.table) {
            // Creating each item's content by calling func on each row
            let content = pennfunc(table.table[row]);
            // The PennController function returns an object to be passed along with "PennController"
            if (!(content instanceof Array) && content.hasOwnProperty("instructions"))
                content = ["PennController", content];
            let item = content;
            // If even number of elements, the user didn't pass a function that returns an array containing a label
            if (content.length % 2 == 0) {
                // Creating the item itself
                item = [["Item-"+row]].concat(content);
                // If a label column was defined
                if (table.label && table.table[row].hasOwnProperty(table.label))
                    item[0] = table.table[row][table.label];
                // Else, if an item column was defined
                else if (table.item && table.table[row].hasOwnProperty(table.item))
                    item[0] = "Item-"+table.table[row][table.item];
            }
            
            // If group design
            if (table.item && table.group) {
                //  groups = {
                //      item1: {
                //          group1: [ "Name", "Controller", Options, ... ],  
                //          group2: [ "Name", "Controller", Options, ... ]
                //      },
                //      item2: {
                //          group1: [ "Name", "Controller", Options, ... ],  
                //          group2: [ "Name", "Controller", Options, ... ]
                //      },
                //      ...
                //  }
                let itemID = table.table[row][table.item], groupID = table.table[row][table.group];
                // If this item is not listed yet, add it
                if (!groups.hasOwnProperty(itemID)) groups[itemID] = {};
                // Adding the item
                groups[itemID][groupID] = item;
            }
            // No group: directly add the item
            else items.push(item);
        }
        // If group design
        if (table.item && table.group) {
            // Retrieve the list of groups
            let groupList = Object.keys(groups[Object.keys(groups)[0]]);
            // Go through each item in groups
            for (let itemID in groups) {
                // Go through each group version of the item
                for (let groupID in groupList) {
                    // Make sure there is a version of this item for this group
                    if (!groups[itemID].hasOwnProperty(groupList[groupID])) {
                        console.log("Error: item "+itemID+" has no entry for group "+groupList[groupID]);
                        return Abort;
                    }
                    // Get the specific entry
                    let item = groups[itemID][groupList[groupID]];
                    // Rename the label to add 'itemID' as the latin-square ID
                    item[0] = [item[0], itemID];
                    // Add it to the final items
                    items.push(item);
                }
                // Cycle through groupList for next item, ensuring latin-square hack
                groupList.unshift(groupList.pop());
            }
        }
        return items;
    }


    // ====     CORE      ====
    //
    
    let table;
    let returnFunction;

    // No table specified, try to automatically detect
    if (param1 instanceof Function && param2 == undefined) {
        returnFunction = param1;
        table = _smartTableDetection();
        if (!table)
            return;
        table = new Table(table);
    }
    else if (param2 instanceof Function) {
        if (!(param1 instanceof Table))
            return;
        returnFunction = param2;
        table = param1
    }
    if (!(items instanceof Array))
        items = [];
    items = items.concat(_getItemsFrom(table, param1));
};

// The TABLE class contains an 2x2 Array-Object and defines Item, Group and Label
class Table {
    constructor(table) {
        if (!(table instanceof Array) || table.length < 2 || Object.keys(table[0]).length < 2)
            return Abort;
        this.table = table;
        for (let col in table[0]) {
            if (col.match(/^item$/i))
                this.item = col;
            if (col.match(/^group$/i))
                this.group = col;
            if (col.match(/^label$/i))
                this.label = col;
        }
    }
    setItem(col) {
        if (!this.table[0].hasOwnProperty(col)) {
            console.log("Error when setting table's item column: no column found with the name "+col);
            return Abort;
        }
        this.item = col;
    }
    setGroup(col) {
        if (!this.table[0].hasOwnProperty(col)) {
            console.log("Error when setting table's item column: no column found with the name "+col);
            return Abort;
        }
        this.group = col;
    }
    setLabel(col) {
        if (!this.table[0].hasOwnProperty(col)) {
            console.log("Error when setting table's item column: no column found with the name "+col);
            return Abort;
        }
        this.label = col;
    }
}