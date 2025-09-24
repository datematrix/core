// 구성은 engine하나를 만들어서 singleton 혹은 useRef로 관리.
// tree는 entry id만 가지고 있음. 실제 entry 정보는 Map에 atom으로 관리.
// tree에서 entry id 검색 -> Map에서 atom 가져옴

export class CalendarEngine {
  private _map = new Map();
  private _dirty = false;
}

class EntryNode {}

class EntryLeaf {}
