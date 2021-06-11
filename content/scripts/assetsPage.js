function submit() {
  var hideNoneHanger = getElementById('checkbox_hideNoneHanger').checked;
  var hideNPCStation = getElementById('checkbox_hideNPCStation').checked;

  console.log(hideNoneHanger, hideNPCStation);
}

function buildTable(data) {
  // img,name, basePrice, is_singleton, item_id, location_flag, location_id, location_type, quantity, type_id
  var table = document.getElementById('table_body');
  for (i in data) {

  }
}

function resizeIframe(obj) {
  obj.style.height = obj.contentWindow.document.documentElement.scrollHeight + 'px';
}

function test() {
  console.log('Test');
}

function clearTable() {
  var table = document.getElementById('table_body');
  table.innerText = "";
}
