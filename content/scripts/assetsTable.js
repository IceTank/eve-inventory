function newSrc(obj) {
  var foo = obj.src.split('/icon?')[0];
  var foo2 = foo.split('/');
  var id = foo2[foo2.length - 1];
  obj.src = 'https://images.evetech.net/types/' + id + '/bp';
}
