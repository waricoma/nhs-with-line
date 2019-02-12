'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
let toDoList = [];
let regexList = [];
let router = {};
router['user'] = [];
router['group'] = [];
router['room'] = [];
function ear(event, callback) {
  if (event.type !== 'message') {
    callback(event, event);
    return true;
  }
  let heard = false;
  for (let _i = 0, _a = router[event.source.type]; _i < _a.length; _i++) {
    let regexI = _a[_i];
    if (!(regexList[regexI].test(event.message.text)))
      continue;
    toDoList[regexI](event);
    heard = true;
    break;
  }
  callback(event, heard);
  return true;
}
module.exports.ear = ear;
function hears(regex, positions, toDo) {
  if (positions.length === 0)
    return false;
  let isItAll = (positions.indexOf('all') !== -1);
  if (!isItAll
    &&
    !(Object.keys(router).some((elm) => { return (positions.indexOf(elm) !== -1); })))
    return false;
  let toDoListLen = toDoList.length;
  toDoList.push(toDo);
  regexList.push(regex);
  if (isItAll) {
    for (let position in router)
      router[position].push(toDoListLen);
    return true;
  }
  for (let _i = 0, positions_1 = positions; _i < positions_1.length; _i++) {
    let position = positions_1[_i];
    router[position].push(toDoListLen);
  }
  return true;
}
module.exports.hears = hears;