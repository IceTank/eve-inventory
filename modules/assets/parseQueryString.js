const validSortingNames = ['name', 'quantity', 'location_id', 'location_flag'];

exports.parseQueryString = function(queryString) {
  var options = {}
  console.log(queryString);
  if (queryString.searchItem) {
    options.searchItem = queryString.searchItem;
  }
  if (queryString.order && queryString.order == 'descending') {
    options.order = 'descending'
  }
  if (queryString.sort && validSortingNames.includes(queryString.sort)) {
    options.sort = queryString.sort
  }
  if (queryString.itemsPerPage) {
    options.itemsPerPage = queryString.itemsPerPage;
  }
  if (queryString.page) {
    options.page = queryString.page > 0 ? queryString.page : 1;
    // var page = {};
    // var foo = queryString.page.split(';');
    // for (i in foo) {
    //   var foo2 = foo[i].split(' ');
    //   try {
    //     page[foo2[0]] = JSON.parse(foo2[1]);
    //   } catch (e) {
    //     page[foo2[0]] = null;
    //   }
    // }
    // options.page = page;
  }
  if (queryString.filter) {
    var filter = {};
    if (queryString.filter.includes("hideNoneHanger")) filter["hideNoneHanger"] = true;
    if (queryString.filter.includes("hideNPCStation")) filter["hideNPCStation"] = true;
    options.filter = filter;
  }
  return options;
}
