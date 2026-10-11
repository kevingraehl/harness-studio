(() => {
  'use strict';

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const STORAGE_KEY = 'harness-studio-project-v1-furukawa-final';
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const uid = (prefix) => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const esc = (s = '') => String(s).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const deep = value => JSON.parse(JSON.stringify(value));
  const R = window.HarnessRouting;
  const bundleSettings = name => {
    state.project.bundles ||= {};
    if(!Object.prototype.hasOwnProperty.call(state.project.bundles,name))Object.defineProperty(state.project.bundles,name,{value:{openStart:10,openEnd:10,thickness:12},writable:true,enumerable:true,configurable:true});
    return state.project.bundles[name];
  };

  const els = {
    svg: $('#canvas'), viewport: $('#viewport'), grid: $('#grid-bg'), loomLayer: $('#loom-layer'),
    wireLayer: $('#wire-layer'), nodeLayer: $('#node-layer'), interactionLayer: $('#interaction-layer'),
    shell: $('#canvas-shell'), empty: $('#empty-state'), inspector: $('#inspector'), inspectorEmpty: $('#inspector-empty'),
    selectionKind: $('#selection-kind'), deleteSelection: $('#delete-selection'), status: $('#status-message'),
    toolIndicator: $('#tool-indicator'), zoomIndicator: $('#zoom-indicator'), projectName: $('#project-name'),
    projectNotes: $('#project-notes'), projectStatus: $('#project-status'), projectBackground: $('#project-background')
  };

  const initial = () => ({
    version: 1,
    project: {name: 'Untitled harness', notes: '', background: '#fafbfd', bundleView: false, created: new Date().toISOString(), updated: new Date().toISOString()},
    view: {x: 0, y: 0, zoom: 1, grid: true},
    nodes: [], wires: [], looms: []
  });

  let state = initial();
  let selected = null;
  const multi = new Map();
  const selectionKey=s=>`${s.kind}:${s.id}:${s.branch??''}`;
  const elementSelection=el=>({kind:el.classList.contains('node')?'node':'wire',id:el.dataset.id,...(el.dataset.branch!==undefined?{branch:Number(el.dataset.branch)}:{})});
  function multiHighlight(){$$('.node,.wire',els.svg).forEach(el=>el.classList.toggle('multi-selected',multi.has(selectionKey(elementSelection(el)))));}
  function shortenSelection(length){
    const targets=new Map();
    for(const s of multi.values()){
      if(s.kind==='wire'){const w=state.wires.find(w=>w.id===s.id);if(w)(s.branch===undefined?[0,1]:[s.branch]).forEach(end=>targets.set(w.id+':'+end,{w,end}));}
      if(s.kind==='node'){const n=state.nodes.find(n=>n.id===s.id);if(n)state.wires.forEach(w=>[w.from,w.to].forEach((id,end)=>{if(n.pins.some(p=>p.id===id))targets.set(w.id+':'+end,{w,end});}));}
    }
    targets.forEach(({w,end})=>{const f=findPin(end?w.to:w.from);const p=pinPosition(f.node,f.pin),d={top:[0,-1],bottom:[0,1],left:[-1,0],right:[1,0]}[f.pin.side]||[1,0];w['branch'+end]=[{x:p.x+d[0]*length,y:p.y+d[1]*length}];});
    changed(`${targets.size} wire exits set to ${length} drawing units`);
  }
  let drawingShape = null;
  let tool = 'select';
  let drag = null;
  let wireStart = null;
  let pointerWorld = {x: 0, y: 0};
  let undoStack = [];
  let redoStack = [];
  let restoring = false;
  let saveTimer = null;
  let referenceCatalog = [];

  function svgEl(tag, attrs = {}, text = '') {
    const el = document.createElementNS(SVG_NS, tag);
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
    if (text) el.textContent = text;
    return el;
  }

  function setStatus(message) {
    els.status.textContent = message;
    clearTimeout(setStatus.timer);
    setStatus.timer = setTimeout(() => els.status.textContent = 'Ready', 2600);
  }

  function snapshot() {
    return JSON.stringify({project: state.project, view: state.view, nodes: state.nodes, wires: state.wires, looms: state.looms});
  }

  function checkpoint() {
    if (restoring) return;
    const snap = snapshot();
    if (undoStack.at(-1) !== snap) undoStack.push(snap);
    if (undoStack.length > 80) undoStack.shift();
    redoStack.length = 0;
    updateHistoryButtons();
  }

  function restore(snap) {
    restoring = true;
    const parsed = JSON.parse(snap);
    state = {...initial(), ...parsed};
    selected = null;
    wireStart = null;
    restoring = false;
    syncProjectFields();
    render();
    scheduleSave();
  }

  function undo() {
    if (undoStack.length < 2) return;
    redoStack.push(undoStack.pop());
    restore(undoStack.at(-1));
    updateHistoryButtons();
  }

  function redo() {
    if (!redoStack.length) return;
    const snap = redoStack.pop();
    undoStack.push(snap);
    restore(snap);
    updateHistoryButtons();
  }

  function updateHistoryButtons() {
    $('#undo').disabled = undoStack.length < 2;
    $('#redo').disabled = !redoStack.length;
  }

  function changed(message = 'Updated') {
    state.project.updated = new Date().toISOString();
    checkpoint();
    scheduleSave();
    render();
    setStatus(message);
  }

  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      els.projectStatus.textContent = `${state.project.name} · autosaved`;
    }, 250);
  }

  function syncProjectFields() {
    els.projectName.value = state.project.name;
    els.projectNotes.value = state.project.notes;
    els.projectBackground.value = state.project.background || '#fafbfd';
    els.projectStatus.textContent = state.project.name;
    $('#grid-toggle').classList.toggle('active', state.view.grid);
    $('#bundle-toggle').classList.toggle('active', !!state.project.bundleView);
  }

  function screenToWorld(clientX, clientY) {
    const rect = els.svg.getBoundingClientRect();
    return {
      x: (clientX - rect.left - state.view.x) / state.view.zoom,
      y: (clientY - rect.top - state.view.y) / state.view.zoom
    };
  }

  function viewportCenter() {
    const rect = els.svg.getBoundingClientRect();
    return screenToWorld(rect.left + rect.width / 2, rect.top + rect.height / 2);
  }

  function snap(n) { return (state.view.snap??true) ? Math.round(n / 20) * 20 : n; }

  function applyView() {
    $('#grid-toggle').textContent=state.view.grid?'Hide grid':'Show grid';
    $('#snap-toggle').classList.toggle('active',state.view.snap??true);
    $('#snap-toggle').textContent=(state.view.snap??true)?'Snap: on':'Snap: off';
    $('#snap-toggle').setAttribute('aria-pressed',String(state.view.snap??true));
    els.viewport.setAttribute('transform', `translate(${state.view.x} ${state.view.y}) scale(${state.view.zoom})`);
    els.grid.style.display = state.view.grid ? '' : 'none';
    els.zoomIndicator.textContent = `${Math.round(state.view.zoom * 100)}%`;
  }

  function makePins(count) {
    return Array.from({length: count}, (_, i) => ({
      id: uid('pin'), number: String(i + 1), label: '', type: 'signal', gender: 'unknown', side: 'auto', offsetX: '', offsetY: '',
      terminal: 'unknown', wireColor: '#64748b', tracerColor: '', notes: ''
    }));
  }

  function addConnector(options = {}) {
    const p = viewportCenter();
    const count = Number(options.pinCount || 6);
    const node = {
      id: uid('connector'), kind: 'connector', name: options.name || 'Connector', x: snap(p.x - 80), y: snap(p.y - 80),
      width: 190, pinCount: count, columns: Number(options.columns || 2), gender: options.gender || 'female',
      view: options.view || 'mating face', color: options.color || '#263341', manufacturer: options.manufacturer || '',
      family: options.family || '', partNumber: options.partNumber || '', terminalSeries: options.terminalSeries || '', shape: 'rounded', shapePoints: '', notes: '', pins: makePins(count)
    };
    state.nodes.push(node); selected = {kind: 'node', id: node.id}; changed('Connector added');
  }

  function addDevice(options = {}) {
    const p = viewportCenter();
    const isSpst = options.symbol === 'spst' || options.symbol === 'kickstand';
    const isThrottle = options.symbol === 'throttle'||options.symbol==='pot';
    const isTerminal = options.symbol === 'spade' || options.symbol === 'bullet';
    const pins = isSpst ? makePins(2) : (isThrottle ? makePins(3) : (isTerminal ? makePins(1) : []));
    if (isSpst) {
      const kickstand = options.symbol === 'kickstand';
      pins[0] = {...pins[0], number: '1', label: kickstand ? 'Black/white' : 'Key input', type: kickstand ? 'signal' : 'power', side: 'left'};
      pins[1] = {...pins[1], number: '2', label: kickstand ? 'Green' : 'Key output', type: kickstand ? 'signal' : 'power', side: 'right'};
    }
    if (isThrottle) {
      pins[0] = {...pins[0], number: 'A', label: 'Brown · +5 V', type: 'power', wireColor: '#7a4a24'};
      pins[1] = {...pins[1], number: 'B', label: 'Black · ground', type: 'ground', wireColor: '#202020'};
      pins[2] = {...pins[2], number: 'C', label: 'Blue · signal', type: 'signal', wireColor: '#2375d8'};
      ['Supply / end A','Ground / end B',options.symbol==='pot'?'Wiper':'Hall signal'].forEach((label,i)=>{pins[i].label=label;pins[i].wireColor='#64748b';});
    }
    if(options.symbol==='motor'){
      ['Phase U','Phase V','Phase W','Hall supply','Hall return','Hall A','Hall B','Hall C','Temperature (optional)'].forEach((label,i)=>{pins.push({...makePins(1)[0],number:String(i+1),label,side:i<3?'left':'right',edgeFraction:i<3?(i+1)/4:(i-2)/7});});
    }
    if(options.symbol==='battery') ['Pack +','Pack −','Aux / BMS (unassigned)'].forEach((label,i)=>pins.push({...makePins(1)[0],number:String(i+1),label,side:'top',edgeFraction:(i+1)/4}));
    const node = {
      id: uid('device'), kind: 'device', name: options.name || 'Device', symbol: options.symbol || 'box',
      x: snap(p.x - 90), y: snap(p.y - 50), width: Number(options.width || 180), height: Number(options.height || 100),
      color: options.color || '#e8eef5', shape: options.shape || 'rounded', shapePoints: '', notes: options.symbol === 'kickstand' ? 'Two-wire kickstand safety switch. Switching method and normal state unverified; do not assume Hall sensor.' : (isSpst ? 'Two-terminal SPST contact. Closed in key ON position.' : (isThrottle ? 'Throttle. Verify part number and wire colours on your own bike.' : (options.symbol === 'spade' ? '0.250 inch / 6.35 mm spade terminal for low-voltage circuits.' : (options.symbol === 'bullet' ? 'Inline bullet connector.' : '')))), pins
    };
    node.appearance=['battery','motor','throttle','pot'].includes(node.symbol)?'illustrated':'simple';
    if(['battery','motor','throttle','pot'].includes(node.symbol)){node.width=300;node.height=230;node.notes='Generic editable template. Functions are not verified cavity assignments; verify actual hardware and wire colors.';}
    if(node.symbol==='throttle')node.sensorType='Hall effect';
    if(node.symbol==='pot'){node.sensorType='Potentiometer';node.resistance=5000;}
    state.nodes.push(node); selected = {kind: 'node', id: node.id}; changed('Device added');
  }

  function addLoom(options = {}) {
    const p = viewportCenter();
    const loom = {id: uid('loom'), name: options.name || 'Main loom', x: snap(p.x - 210), y: snap(p.y - 90), width: Number(options.width || 420), height: Number(options.height || 180), color: options.color || '#64748b', strokeWidth: 3, notes: ''};
    state.looms.push(loom); selected = {kind: 'loom', id: loom.id}; changed('Loom outline added');
  }

  function nodeHeight(node) {
    if(node.shape==='custom'&&Number.isFinite(node.height))return node.height;
    if (node.kind === 'device') return node.height;
    const rows = Math.ceil(node.pins.length / node.columns);
    return 58 + rows * 28 + 16;
  }

  function pinPosition(node, pin) {
    const index = node.pins.findIndex(p => p.id === pin.id);
    if (index < 0) return {x: node.x, y: node.y};
    const side = pin.side || 'auto';
    if(Number.isFinite(pin.edgeFraction)) {
      const t=clamp(pin.edgeFraction,0,1);
      if(side==='top'||side==='bottom')return {x:node.x+node.width*t,y:node.y+(side==='bottom'?nodeHeight(node):0)};
      if(side==='left'||side==='right')return {x:node.x+(side==='right'?node.width:0),y:node.y+nodeHeight(node)*t};
    }
    if (side === 'free') return {x:node.x + Number(pin.offsetX || node.width/2), y:node.y + Number(pin.offsetY || nodeHeight(node)/2)};
    if (side === 'left') return {x:node.x, y:node.y + Number(pin.offsetY || 66 + index*28)};
    if (side === 'right') return {x:node.x+node.width, y:node.y + Number(pin.offsetY || 66 + index*28)};
    if (side === 'top') return {x:node.x + Number(pin.offsetX || 30 + index*28), y:node.y};
    if (side === 'bottom') return {x:node.x + Number(pin.offsetX || 30 + index*28), y:node.y+nodeHeight(node)};
    if (node.kind === 'device') {
      if (pin.side === 'left') return {x: node.x, y: node.y + (pin.offsetY || node.height / 2 + 12)};
      if (pin.side === 'right') return {x: node.x + node.width, y: node.y + (pin.offsetY || node.height / 2 + 12)};
      return {x: node.x + node.width, y: node.y + 35 + index * 24};
    }
    const rows = Math.ceil(node.pins.length / node.columns);
    const col = Math.floor(index / rows);
    const row = index % rows;
    const colW = node.width / node.columns;
    const left = node.x + col * colW;
    const sideRight = col >= node.columns / 2;
    return {x: sideRight ? left + colW : left, y: node.y + 66 + row * 28};
  }

  function findPin(pinId) {
    for (const node of state.nodes) {
      const pin = node.pins.find(p => p.id === pinId);
      if (pin) return {node, pin};
    }
    return null;
  }

  function wirePath(wire) {
    const a = findPin(wire.from); const b = findPin(wire.to);
    if (!a || !b) return '';
    const p1 = pinPosition(a.node, a.pin), p2 = pinPosition(b.node, b.pin);
    if(wire.waypoints?.length)return R.path([p1,...wire.waypoints,p2]);
    if(wire.routing==='straight')return R.path([p1,p2]);
    if (wire.routing === 'orthogonal') {
      const vertical1 = ['top','bottom'].includes(a.pin.side);
      const vertical2 = ['top','bottom'].includes(b.pin.side);
      if (vertical1 && vertical2) {
        const lane = Number.isFinite(Number(wire.lane)) && wire.lane !== '' ? Number(wire.lane) : (p1.y + p2.y) / 2;
        return `M ${p1.x} ${p1.y} L ${p1.x} ${lane} L ${p2.x} ${lane} L ${p2.x} ${p2.y}`;
      }
      if (!vertical1 && !vertical2) {
        const lane = Number.isFinite(Number(wire.lane)) && wire.lane !== '' ? Number(wire.lane) : (p1.x + p2.x) / 2;
        return `M ${p1.x} ${p1.y} L ${lane} ${p1.y} L ${lane} ${p2.y} L ${p2.x} ${p2.y}`;
      }
      return vertical1
        ? `M ${p1.x} ${p1.y} L ${p1.x} ${p2.y} L ${p2.x} ${p2.y}`
        : `M ${p1.x} ${p1.y} L ${p2.x} ${p1.y} L ${p2.x} ${p2.y}`;
    }
    const dx = Math.max(55, Math.abs(p2.x - p1.x) * .42);
    const dir = p2.x >= p1.x ? 1 : -1;
    return `M ${p1.x} ${p1.y} C ${p1.x + dx * dir} ${p1.y}, ${p2.x - dx * dir} ${p2.y}, ${p2.x} ${p2.y}`;
  }

  function wireMidpoint(wire) {
    if(wire.waypoints?.length){const pts=wirePoints(wire);let best=0;for(let i=1;i<pts.length-1;i++)if(R.distance(pts[i],pts[i+1])>R.distance(pts[best],pts[best+1]))best=i;return{x:(pts[best].x+pts[best+1].x)/2,y:(pts[best].y+pts[best+1].y)/2-8};}
    const a = findPin(wire.from), b = findPin(wire.to);
    if (!a || !b) return {x: 0, y: 0};
    const p1 = pinPosition(a.node, a.pin), p2 = pinPosition(b.node, b.pin);
    return {x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 - 7};
  }

  function wirePoints(wire) {
    const d=wirePath(wire), nums=d.match(/-?\d+(?:\.\d+)?/g)?.map(Number)||[];
    const points=[];for(let i=0;i<nums.length;i+=2)points.push({x:nums[i],y:nums[i+1]});
    return points;
  }

  function bundleGeometry(name,wires) {
    const ends=wires.flatMap(w=>[w.from,w.to].map((id,end)=>{const f=findPin(id);return f?{wire:w,p:pinPosition(f.node,f.pin),side:f.pin.side,node:f.node,end}:null}).filter(Boolean));
    if(!ends.length)return null;
    const settings=bundleSettings(name),xs=ends.map(e=>e.p.x),ys=ends.map(e=>e.p.y);
    const horizontal=Math.max(...xs)-Math.min(...xs)>=Math.max(...ys)-Math.min(...ys);
    const cross=(horizontal?ys:xs).reduce((a,b)=>a+b,0)/ends.length;
    const values=horizontal?xs:ys,lo=Math.min(...values),hi=Math.max(...values);
    const route=settings.route?.length>=2?settings.route:horizontal?[{x:lo,y:cross},{x:hi,y:cross}]:[{x:cross,y:lo},{x:cross,y:hi}];
    const start=clamp(Number(settings.openStart??10),0,100)/100,end=Math.max(start,1-clamp(Number(settings.openEnd??10),0,100)/100);
    return {settings,route,covered:R.slice(route,start,end),ends};
  }

  function renderRouteHandles() {
    if(tool!=='select')return;
    let points;
    if(selected?.kind==='wire'){const w=selectedItem();if(w)points=selected.branch!==undefined?w['branch'+selected.branch]||[]:wirePoints(w).slice(1,-1);}
    if(selected?.kind==='bundle')points=bundleGeometry(selected.id,state.wires.filter(w=>w.bundle===selected.id))?.route;
    (points||[]).forEach((p,i)=>els.interactionLayer.append(svgEl('circle',{'class':'route-handle','data-route-index':i,cx:p.x,cy:p.y,r:7/state.view.zoom,fill:'#ff9d20',stroke:'#111','stroke-width':1.5/state.view.zoom})));
  }

  function edgePlacement(node,p,free=false) {
    const x=clamp(p.x-node.x,0,node.width),y=clamp(p.y-node.y,0,nodeHeight(node));
    const sides=[['left',x],['right',node.width-x],['top',y],['bottom',nodeHeight(node)-y]].sort((a,b)=>a[1]-b[1]);
    const side=sides[0][0],size=['top','bottom'].includes(side)?node.width:nodeHeight(node);
    let t=(['top','bottom'].includes(side)?x:y)/size;
    if(!free&&(state.view.snap??true))t=Math.round(t*16)/16;
    return {side,edgeFraction:clamp(t,0,1),offsetX:'',offsetY:''};
  }

  function edgePin(node,p,free=false) {
    const placement=edgePlacement(node,p,free),preview={id:'preview',...placement};
    const pos=pinPosition({...node,pins:[...node.pins,preview]},preview);
    const existing=node.pins.find(pin=>R.distance(pinPosition(node,pin),pos)<8/state.view.zoom);
    if(existing)return existing.id;
    let number=node.pins.length+1;while(node.pins.some(p=>p.number===String(number)))number++;
    const pin={...makePins(1)[0],number:String(number),label:'Unassigned',notes:'Added on canvas; physical terminal assignment unverified.',...placement};
    node.pins.push(pin);return pin.id;
  }

  function render() {
    const background = state.project.background || '#fafbfd';
    els.shell.style.background = background;
    const rgb = background.match(/[a-f\d]{2}/gi)?.map(v=>parseInt(v,16)) || [250,251,253];
    const dark = (rgb[0]*299 + rgb[1]*587 + rgb[2]*114) / 1000 < 128;
    els.shell.classList.toggle('dark-canvas', dark);
    els.shell.style.setProperty('--wire-contrast', dark ? '#b2bbc5' : '#45515d');
    els.shell.style.setProperty('--grid-minor-local', dark ? '#263342' : '#dce3eb');
    els.shell.style.setProperty('--grid-major-local', dark ? '#3a4b60' : '#bcc8d5');
    applyView();
    renderLooms();
    renderWires();
    renderNodes();
    renderTempWire();
    renderInspector();
    els.empty.style.display = state.nodes.length || state.looms.length ? 'none' : 'flex';
    els.deleteSelection.disabled = !selected;
  }

  function renderLooms() {
    els.loomLayer.replaceChildren();
    if(state.project.schematicView)return;
    state.looms.forEach(loom => {
      const g = svgEl('g', {'class': `loom ${selected?.kind === 'loom' && selected.id === loom.id ? 'selected' : ''}`, 'data-id': loom.id});
      g.append(svgEl('rect', {x: loom.x, y: loom.y, width: loom.width, height: loom.height, rx: 28, fill: 'none', stroke: loom.color, 'stroke-width': loom.strokeWidth}));
      g.append(svgEl('text', {x: loom.x + 16, y: loom.y + 23}, loom.name));
      if (selected?.kind === 'loom' && selected.id === loom.id) g.append(svgEl('rect', {'class': 'loom-resize', x: loom.x + loom.width - 7, y: loom.y + loom.height - 7, width: 14, height: 14, rx: 3, 'data-resize': loom.id}));
      els.loomLayer.append(g);
    });
  }

  function renderWires() {
    els.wireLayer.replaceChildren();
    // Reference-layout trunks describe physical loom routing, not electrical nets.
    if(state.project.referenceTrunks) for(const route of state.project.referenceTrunks) {
      els.wireLayer.append(svgEl('polyline',{points:route.map(p=>`${p[0]*3},${p[1]*3}`).join(' '),fill:'none',stroke:'#111','stroke-width':18,'stroke-linejoin':'round','pointer-events':'none'}));
    }
    for(const node of state.nodes.filter(n=>n.referenceBranch)) {
      const [x,y]=node.referenceBranch;
      node.pins.forEach(p=>{const pos=pinPosition(node,p);els.wireLayer.append(svgEl('path',{d:`M ${pos.x} ${pos.y} L ${x*3} ${y*3}`,fill:'none',stroke:'#84949c','stroke-width':2,'stroke-dasharray':'5 3','pointer-events':'none'}));});
    }
    const grouped = new Map();
    if (state.project.bundleView) state.wires.forEach(wire=>{if(wire.bundle){if(!grouped.has(wire.bundle))grouped.set(wire.bundle,[]);grouped.get(wire.bundle).push(wire)}});
    const drawWire = wire => {
      const path = wirePath(wire); if (!path) return;
      const g = svgEl('g', {'class': `wire ${selected?.kind === 'wire' && selected.id === wire.id ? 'selected' : ''}`, 'data-id': wire.id});
      g.append(svgEl('path', {'class': 'wire-hit', d: path}));
      g.append(svgEl('path', {'class': 'wire-contrast', d: path, stroke: 'var(--wire-contrast)', 'stroke-width': Number(wire.thickness || 3) + 3}));
      if (wire.tracerColor) g.append(svgEl('path', {'class': 'wire-path', d: path, stroke: wire.tracerColor, 'stroke-width': wire.thickness + 3}));
      g.append(svgEl('path', {'class': 'wire-path', d: path, stroke: wire.color, 'stroke-width': wire.thickness, 'stroke-dasharray': wire.style === 'dashed' ? '9 6' : ''}));
      if (wire.tracerColor) g.append(svgEl('path', {'class': 'wire-path', d: path, stroke: wire.tracerColor, 'stroke-width': Math.max(1, wire.thickness * .22), 'stroke-dasharray': '12 5'}));
      const mid = wireMidpoint(wire);
      const bits = [wire.label, wire.gauge ? `${wire.gauge} AWG` : '', wire.length ? `${wire.length} ${wire.lengthUnit || 'mm'}` : ''].filter(Boolean);
      if (bits.length && wire.showLabel !== false) g.append(svgEl('text', {'class': 'wire-label', x: mid.x, y: mid.y}, bits.join(' · ')));
      els.wireLayer.append(g);
    };
    state.wires.filter(w=>!state.project.bundleView || !w.bundle || (grouped.get(w.bundle)?.length||0)<2).forEach(drawWire);
    grouped.forEach((wires,name)=>{
      if(wires.length<2)return;
      const geometry=bundleGeometry(name,wires);if(!geometry)return;
      const {settings,covered,ends}=geometry,trunkPath=R.path(covered),mid=R.at(covered,.5),width=clamp(Number(settings.thickness)||12,4,60);
      const tg=svgEl('g',{'class':'bundle-trunk','data-bundle':name});
      tg.append(svgEl('path',{'class':'wire-hit',d:trunkPath,'stroke-width':Math.max(20,width+8)}));
      tg.append(svgEl('path',{'class':'wire-contrast',d:trunkPath,stroke:'var(--wire-contrast)','stroke-width':width+3}));
      tg.append(svgEl('path',{'class':'wire-path',d:trunkPath,stroke:'#151a20','stroke-width':width}));
      tg.append(svgEl('text',{'class':'wire-label',x:mid.x,y:mid.y-width/2-8},`${name} · ${wires.length} wires · ${100-(settings.openStart??10)-(settings.openEnd??10)}% covered`));
      els.wireLayer.append(tg);
      ends.forEach(({wire,p,side,node,end})=>{
        const other=findPin(end?wire.from:wire.to),otherPos=pinPosition(other.node,other.pin);
        const exposure=clamp(Number(end?settings.openEnd??10:settings.openStart??10),0,100)/100;
        const stubLength=Math.min(60,R.distance(p,otherPos)*exposure);
        const direction=side==='top'?[0,-1]:side==='bottom'?[0,1]:side==='left'?[-1,0]:side==='right'?[1,0]:p.x>node.x+node.width/2?[1,0]:[-1,0];
        const stub={x:p.x+direction[0]*stubLength,y:p.y+direction[1]*stubLength};
        const bends=wire['branch'+end]||[stub];
        const q=R.closest(covered,bends.at(-1)||p).point;
        const d=R.path([p,...bends,q]);
        const g=svgEl('g',{'class':`wire ${selected?.kind==='wire'&&selected.id===wire.id?'selected':''}`,'data-id':wire.id,'data-branch':end});
        g.append(svgEl('path',{'class':'wire-hit',d}));g.append(svgEl('path',{'class':'wire-contrast',d,stroke:'var(--wire-contrast)','stroke-width':Number(wire.thickness||3)+3}));g.append(svgEl('path',{'class':'wire-path',d,stroke:wire.color,'stroke-width':wire.thickness||3}));els.wireLayer.append(g);
        if(wire.tracerColor)g.append(svgEl('path',{'class':'wire-path',d,stroke:wire.tracerColor,'stroke-width':1.5,'stroke-dasharray':'7 5'}));
      });
    });
  }

  function renderNodes() {
    els.nodeLayer.replaceChildren();
    state.nodes.forEach(node => {
      const h = nodeHeight(node);
      const g = svgEl('g', {'class': `node ${selected?.kind === 'node' && selected.id === node.id ? 'selected' : ''}`, 'data-id': node.id});
      if(node.referenceTable){
        g.append(svgEl('rect',{'class':'body',x:node.x,y:node.y,width:node.width,height:h,fill:'#fff',stroke:'#222','stroke-width':2}));
        g.append(svgEl('text',{x:node.x-10,y:node.y+18,fill:'#111','font-size':19,'text-anchor':'end'},node.name));
        node.pins.forEach((p,i)=>{const y=node.y+i*h/node.pins.length,position=pinPosition(node,p);g.append(svgEl('line',{x1:node.x,y1:y,x2:node.x+node.width,y2:y,stroke:'#888','stroke-width':1}));g.append(svgEl('text',{x:node.x+5,y:y+18,fill:'#111','font-size':17},`${p.number} ${p.label||'?'}`));g.append(svgEl('circle',{'class':'pin','data-pin':p.id,cx:position.x,cy:position.y,r:4,fill:'#718096',stroke:'#fff'}));});
        els.nodeLayer.append(g);return;
      }
      g.append(nodeBody(node,h));
      g.append(svgEl('text', {'class': 'node-title', x: node.x + 14, y: node.y + 23}, node.name));
      const sub = node.kind === 'connector' ? `${node.gender} · ${node.pins.length} position · ${node.view}` : node.symbol;
      g.append(svgEl('text', {'class': 'node-subtitle', x: node.x + 14, y: node.y + 41}, sub));
      if (node.kind === 'device') renderDeviceSymbol(g, node);
      renderPins(g, node);
      if(tool==='wire') {
        ['top','right','bottom','left'].forEach(side=>{
          for(let i=1;i<16;i++) {
            const preview={id:'preview',side,edgeFraction:i/16};const pos=pinPosition({...node,pins:[preview]},preview);
            g.append(svgEl('circle',{'class':'edge-anchor','pointer-events':'none',cx:pos.x,cy:pos.y,r:3/state.view.zoom,fill:'#37c9e8',stroke:'#10232a','stroke-width':1/state.view.zoom}));
          }
        });
      }
      els.nodeLayer.append(g);
    });
  }

  function nodeBody(node,h) {
    const common={'class':'body',fill:node.color}; const shape=node.shape||'rounded';
    if(shape==='circle') return svgEl('ellipse',{...common,cx:node.x+node.width/2,cy:node.y+h/2,rx:node.width/2,ry:h/2});
    if(shape==='triangle') return svgEl('polygon',{...common,points:`${node.x+node.width/2},${node.y} ${node.x+node.width},${node.y+h} ${node.x},${node.y+h}`});
    if(shape==='diamond') return svgEl('polygon',{...common,points:`${node.x+node.width/2},${node.y} ${node.x+node.width},${node.y+h/2} ${node.x+node.width/2},${node.y+h} ${node.x},${node.y+h/2}`});
    if(shape==='hexagon') return svgEl('polygon',{...common,points:`${node.x+node.width*.22},${node.y} ${node.x+node.width*.78},${node.y} ${node.x+node.width},${node.y+h/2} ${node.x+node.width*.78},${node.y+h} ${node.x+node.width*.22},${node.y+h} ${node.x},${node.y+h/2}`});
    if(shape==='custom'&&node.shapePoints){const pts=node.shapePoints.trim().split(/\s+/).map(pair=>{const [x,y]=pair.split(',').map(Number);return `${node.x+node.width*x/100},${node.y+h*y/100}`}).join(' ');return svgEl('polygon',{...common,points:pts});}
    return svgEl('rect',{...common,x:node.x,y:node.y,width:node.width,height:h,rx:shape==='square'?0:12});
  }

  function renderDeviceSymbol(g, node) {
    const cx = node.x + node.width / 2, cy = node.y + node.height / 2 + 12;
    if(node.appearance==='illustrated'){
      const ink={fill:'none',stroke:'var(--muted)','stroke-width':3,'pointer-events':'none'};
      if(node.symbol==='motor'){g.append(svgEl('rect',{...ink,x:cx-48,y:cy-40,width:96,height:80,rx:24}),svgEl('circle',{...ink,cx,cy,r:27}),svgEl('line',{...ink,x1:cx,y1:cy,x2:cx+68,y2:cy}));for(let i=0;i<5;i++)g.append(svgEl('line',{...ink,x1:cx-42+i*20,y1:cy-35,x2:cx-42+i*20,y2:cy+35}));g.append(svgEl('text',{x:cx,y:cy+65,'text-anchor':'middle',fill:'var(--muted)','font-size':12},'3-PHASE · HALL'));return;}
      if(node.symbol==='battery'){g.append(svgEl('path',{...ink,d:`M ${cx-38} ${cy-50} L ${cx+35} ${cy-50} L ${cx+46} ${cy+48} L ${cx-46} ${cy+48} Z`}),svgEl('rect',{...ink,x:cx-23,y:cy-65,width:46,height:15,rx:4}));for(let i=0;i<4;i++)g.append(svgEl('line',{...ink,x1:cx-26+i*17,y1:cy-35,x2:cx-30+i*20,y2:cy+34}));return;}
      if(node.symbol==='throttle'){g.append(svgEl('rect',{...ink,x:cx-65,y:cy-13,width:95,height:26,rx:10}),svgEl('rect',{...ink,x:cx+25,y:cy-26,width:30,height:52,rx:8}),svgEl('path',{...ink,d:`M ${cx+55} ${cy} Q ${cx+82} ${cy} ${cx+82} ${cy+32}`}));g.append(svgEl('text',{x:cx,y:cy+58,fill:'var(--muted)','text-anchor':'middle','font-size':12},node.sensorType||'Hall effect'));return;}
    }
    if(node.symbol==='pot'){g.append(svgEl('path',{d:`M ${cx-55} ${cy} H ${cx-30} l 10 -12 l 10 24 l 10 -24 l 10 24 l 10 -24 l 10 12 H ${cx+55} M ${cx} ${cy+40} V ${cy+8} l -6 10 M ${cx} ${cy+8} l 6 10`,stroke:'var(--muted)','stroke-width':3,fill:'none','pointer-events':'none'}));g.append(svgEl('text',{x:cx,y:cy-28,fill:'var(--muted)','text-anchor':'middle','font-size':12},`${node.resistance??5000} Ω`));return;}
    if (node.symbol === 'spst' || node.symbol === 'kickstand') {
      g.append(svgEl('circle',{cx:cx-35,cy,r:5,fill:'none',stroke:'var(--muted)','stroke-width':3,'pointer-events':'none'}));
      g.append(svgEl('circle',{cx:cx+35,cy,r:5,fill:'none',stroke:'var(--muted)','stroke-width':3,'pointer-events':'none'}));
      g.append(svgEl('line',{x1:cx-30,y1:cy-3,x2:cx+24,y2:cy-24,stroke:'var(--muted)','stroke-width':4,'stroke-linecap':'round','pointer-events':'none'}));
      if (node.symbol === 'kickstand') g.append(svgEl('text',{x:cx,y:cy+30,'text-anchor':'middle','font-size':10,fill:'var(--muted)','pointer-events':'none'},'KICKSTAND'));
      return;
    }
    if (node.symbol === 'throttle') {
      g.append(svgEl('circle',{cx,cy,r:25,fill:'none',stroke:'var(--muted)','stroke-width':4,'pointer-events':'none'}));
      g.append(svgEl('line',{x1:cx,y1:cy,x2:cx+20,y2:cy-20,stroke:'var(--muted)','stroke-width':4,'stroke-linecap':'round','pointer-events':'none'}));
      g.append(svgEl('text',{x:cx,y:cy+40,'text-anchor':'middle','font-size':10,fill:'var(--muted)','pointer-events':'none'},'THROTTLE'));
      return;
    }
    let symbol = {battery: '▥', controller: '▤', converter: '⇣', motor: 'M', display: '▣', ground: '⏚', box: '□', spade:'▰', bullet:'●'}[node.symbol] || '□';
    g.append(svgEl('text', {x: cx, y: cy + 12, 'text-anchor': 'middle', 'font-size': node.symbol === 'motor' ? 32 : 40, fill: 'var(--muted)', 'pointer-events': 'none'}, symbol));
  }

  function renderPins(g, node) {
    if (!node.pins.length) return;
    const rows = node.kind === 'connector' ? Math.ceil(node.pins.length / node.columns) : node.pins.length;
    node.pins.forEach((pin, i) => {
      const pos = pinPosition(node, pin);
      const side = pin.side || 'auto';
      if (node.compactPins) {
        g.append(svgEl('circle', {'class': `pin-handle ${wireStart === pin.id ? 'hot' : ''}`, 'data-pin': pin.id, cx: pos.x, cy: pos.y, r: 7, fill: pin.wireColor || '#64748b'}));
        const tx = side === 'left' ? pos.x + 11 : side === 'right' ? pos.x - 11 : pos.x;
        const ty = side === 'top' ? pos.y + 17 : side === 'bottom' ? pos.y - 10 : pos.y + 4;
        g.append(svgEl('text', {'class':'pin-number','text-anchor':side === 'left' ? 'start' : side === 'right' ? 'end' : 'middle',x:tx,y:ty}, pin.number));
        return;
      }
      if (side === 'top' || side === 'bottom') {
        g.append(svgEl('circle', {'class': `pin-handle ${wireStart === pin.id ? 'hot' : ''}`, 'data-pin': pin.id, cx: pos.x, cy: pos.y, r: 7, fill: pin.wireColor || '#64748b'}));
        const outside = side === 'top' ? -12 : 18;
        g.append(svgEl('text', {'class':'pin-label',x:pos.x,y:pos.y+outside,'text-anchor':'middle'}, pin.label || pin.type));
        g.append(svgEl('text', {'class':'pin-number',x:pos.x,y:pos.y+outside+(side === 'top' ? -11 : 11),'text-anchor':'middle'}, `Pin ${pin.number}`));
        return;
      }
      const col = node.kind === 'connector' ? Math.floor(i / rows) : 1;
      const right = node.kind === 'device' ? pos.x > node.x + node.width / 2 : col >= node.columns / 2;
      const lx = right ? pos.x - 10 : pos.x + 10;
      const anchor = right ? 'end' : 'start';
      g.append(svgEl('circle', {'class': `pin-handle ${wireStart === pin.id ? 'hot' : ''}`, 'data-pin': pin.id, cx: pos.x, cy: pos.y, r: 7, fill: pin.wireColor || '#64748b'}));
      g.append(svgEl('text', {'class': 'pin-label', x: lx, y: pos.y + 1, 'text-anchor': anchor}, pin.label || pin.type));
      g.append(svgEl('text', {'class': 'pin-number', x: lx, y: pos.y + 11, 'text-anchor': anchor}, `Pin ${pin.number}`));
    });
  }

  function renderTempWire() {
    els.interactionLayer.replaceChildren();
    multiHighlight();
    if(drag?.type==='marquee'){const a=drag.start,b=pointerWorld;els.interactionLayer.append(svgEl('rect',{class:'selection-box',x:Math.min(a.x,b.x),y:Math.min(a.y,b.y),width:Math.abs(a.x-b.x),height:Math.abs(a.y-b.y),'pointer-events':'none'}));return;}
    if(drawingShape){els.interactionLayer.append(svgEl('path',{d:R.path([...drawingShape.points,pointerWorld]),fill:'none',stroke:'#ff9d20','stroke-width':3,'pointer-events':'none'}));return;}
    renderRouteHandles();
    if (!wireStart) return;
    const found = findPin(wireStart); if (!found) return;
    const p1 = pinPosition(found.node, found.pin), p2 = pointerWorld;
    const dx = Math.max(50, Math.abs(p2.x - p1.x) * .4);
    const d = `M ${p1.x} ${p1.y} C ${p1.x + dx} ${p1.y}, ${p2.x - dx} ${p2.y}, ${p2.x} ${p2.y}`;
    els.interactionLayer.append(svgEl('path', {'class': 'temp-wire', d}));
  }

  function select(kind, id) {
    selected = id ? {kind, id} : null;
    render();
  }

  function selectedItem() {
    if (!selected) return null;
    if (selected.kind === 'bundle') return bundleSettings(selected.id);
    if (selected.kind === 'node') return state.nodes.find(n => n.id === selected.id);
    if (selected.kind === 'wire') return state.wires.find(w => w.id === selected.id);
    if (selected.kind === 'loom') return state.looms.find(l => l.id === selected.id);
    if (selected.kind === 'pin') return findPin(selected.id)?.pin;
    return null;
  }

  function renderInspector() {
    if(multi.size){els.inspector.hidden=false;els.inspectorEmpty.hidden=true;els.selectionKind.textContent=`${multi.size} selected`;els.inspector.innerHTML='<p>Command/Ctrl-click adds or removes items. Command/Ctrl-drag selects an area.</p><label>Wire exit length (drawing units)<input id="multi-exit-length" type="number" min="0" max="5000" value="60"></label><button data-shorten-multi>Apply to selected wire exits</button><p>Applies to colored branches in Bundle view; selecting a component affects all its connected exits. This changes the drawing, not measured cable lengths.</p><button data-clear-multi>Clear selection</button>';return;}
    const item = selectedItem();
    els.inspector.hidden = !item;
    els.inspectorEmpty.hidden = !!item;
    if (!item) { els.selectionKind.textContent = 'Nothing selected'; return; }
    els.selectionKind.textContent = selected.kind;
    let html = '';
    if (selected.kind === 'node') html = item.kind === 'connector' ? connectorInspector(item) : deviceInspector(item);
    if (selected.kind === 'wire') html = wireInspector(item);
    if (selected.kind === 'loom') html = loomInspector(item);
    if (selected.kind === 'pin') html = pinInspector(item);
    if (selected.kind === 'bundle') html = `<div class="section-title">${esc(selected.id)}</div><p>Set either exposed end from 0–100%. If their sum exceeds 100%, the other end is reduced. Defaults: 10% each.</p><div class="field-row">${field('Open at start (%)','openStart',item.openStart??10,'number','min="0" max="100"')}${field('Open at end (%)','openEnd',item.openEnd??10,'number','min="0" max="100"')}</div>${field('Loom thickness','thickness',item.thickness||12,'number','min="4" max="60"')}<p class="tip">Grab anywhere on the trunk and drag to create a turn. Shift-drag moves the whole route. Orange handles reshape bends; Alt-click removes a bend. Colored branches can be grabbed and bent independently.</p><button type="button" data-reset-route>Reset automatic route</button>`;
    if(selected.kind==='bundle')html+=`<div class="section-title">Conductors</div>${state.wires.map(w=>`<label class="inline-check"><input type="checkbox" data-bundle-member="${esc(w.id)}" ${w.bundle===selected.id?'checked':''}>${esc(w.label||w.id)}</label>`).join('')}`;
    if(selected.kind==='wire')html+=`${selectField('Routing','routing',item.routing||'curved',['curved','orthogonal','straight'])}<button type="button" data-reset-route>Reset bends</button><p class="tip">Drag the line to move its bends; endpoints stay attached. Double-click to add a bend. Alt-click a handle to remove it. Drag a pin to reposition it on its box.</p>`;
    html += referenceInspector(item);
    if(selected.kind==='bundle')html=html.replace('class="section-title"','class="section-title" data-no-i18n');
    els.inspector.innerHTML = html;
  }

  const field = (label, key, value, type = 'text', attrs = '') => `<label>${label}<input data-prop="${key}" type="${type}" value="${esc(value)}" ${attrs}></label>`;
  const selectField = (label, key, value, options) => `<label>${label}<select data-prop="${key}">${options.map(o => `<option value="${esc(o)}" ${o === value ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select></label>`;
  const notesField = value => `<label>Notes<textarea data-prop="notes" rows="3">${esc(value || '')}</textarea></label>`;

  function connectorInspector(n) {
    return `${field('Name','name',n.name)}<div class="field-row">${selectField('Gender','gender',n.gender,['female','male','unknown'])}${selectField('View','view',n.view,['mating face','wire side'])}</div><div class="field-row">${field('Manufacturer','manufacturer',n.manufacturer||'')}${field('Family','family',n.family||'')}</div><div class="field-row">${field('Ordering code','partNumber',n.partNumber||'')}${field('Terminal series','terminalSeries',n.terminalSeries||'')}</div><div class="field-row">${field('Columns','columns',n.columns,'number','min="1" max="8"')}${field('Housing color','color',n.color,'color')}</div>${shapeFields(n)}${nodeAlignmentFields(n)}${notesField(n.notes)}${pinList(n,'position')}`;
  }

  function deviceInspector(n) {
    return `${field('Name','name',n.name)}${selectField('Type','symbol',n.symbol,['box','battery','controller','converter','motor','display','ground','spst','kickstand','throttle','pot','spade','bullet'])}${selectField('Appearance','appearance',n.appearance||'simple',['simple','illustrated'])}${n.symbol==='throttle'?selectField('Throttle sensor','sensorType',n.sensorType||'Hall effect',['Hall effect','Potentiometer','Unknown']):''}${n.symbol==='pot'||n.sensorType==='Potentiometer'?field('Resistance (ohms)','resistance',n.resistance??5000,'number','min="0"'):''}<div class="field-row">${field('Manufacturer','manufacturer',n.manufacturer||'')}${field('Part number','partNumber',n.partNumber||'')}</div><div class="field-row">${field('Width','width',n.width,'number','min="40"')}${field('Height','height',n.height,'number','min="40"')}</div>${field('Fill','color',n.color,'color')}${shapeFields(n)}${nodeAlignmentFields(n)}${notesField(n.notes)}${pinList(n,'terminal')}`;
  }

  const shapeFields=n=>`${selectField('Shape','shape',n.shape||'rounded',['rounded','square','circle','triangle','diamond','hexagon','custom'])}<button type="button" data-draw-shape>Draw custom outline</button>${n.shape==='custom'?field('Custom polygon points (%)','shapePoints',n.shapePoints||'0,0 100,0 100,100 0,100'):''}`;
  const nodeAlignmentFields=n=>`<div class="section-title">Pin alignment</div><div class="field-row">${selectField('Align pins','pinAlignment',n.pinAlignment||'manual',['manual','top','right','bottom','left'])}<label>&nbsp;<button type="button" data-apply-pin-alignment>Apply to all</button></label></div><p class="tip">Use Manual for a mixture. Edit an individual pin below to override its side or use freeform X/Y placement.</p>`;
  const pinList=(n,word)=>`<div class="section-title">${word==='position'?'Pins':'Connection points'} · drag to reorder</div><div class="pin-list">${n.pins.map(p=>`<div class="pin-row" draggable="true" data-edit-pin="${p.id}"><span class="pin-drag" title="Drag to reorder">⋮⋮</span><span class="pin-num">${esc(p.number)}</span><input data-pin-label="${p.id}" value="${esc(p.label)}" placeholder="Function"><button type="button" data-select-pin="${p.id}">Edit</button></div>`).join('')}</div><button type="button" data-add-pin>Add ${word}</button> <button type="button" data-remove-pin ${!n.pins.length?'disabled':''}>Remove last</button>`;

  function wireInspector(w) {
    const a = findPin(w.from), b = findPin(w.to);
    return `<div class="section-title">Endpoints</div><p class="endpoint-text">${esc(a?.node.name || '?')} · pin ${esc(a?.pin.number || '?')} → ${esc(b?.node.name || '?')} · pin ${esc(b?.pin.number || '?')}</p>${field('Circuit / label','label',w.label)}${field('Harness group','bundle',w.bundle||'')}<p class="tip">Give multiple wires the same group name, then turn on Bundle view.</p><div class="field-row">${field('Base color','color',w.color,'color')}${field('Tracer color','tracerColor',w.tracerColor || '#ffffff','color')}</div><label class="inline-check"><input type="checkbox" data-clear-tracer ${w.tracerColor ? '' : 'checked'}> No tracer</label><div class="field-row">${field('Gauge (AWG)','gauge',w.gauge,'number','min="0" max="40" step="0.1"')}${field('Displayed thickness','thickness',w.thickness,'number','min="1" max="20" step="0.5"')}</div><div class="field-row">${field('Physical length','length',w.length,'number','min="0" step="0.1"')}${selectField('Unit','lengthUnit',w.lengthUnit || 'mm',['mm','cm','m','in','ft'])}</div>${selectField('Line style','style',w.style || 'solid',['solid','dashed'])}${notesField(w.notes)}`;
  }

  function loomInspector(l) {
    return `${field('Name','name',l.name)}<div class="field-row">${field('Width','width',l.width,'number','min="40"')}${field('Height','height',l.height,'number','min="40"')}</div><div class="field-row">${field('Outline color','color',l.color,'color')}${field('Outline thickness','strokeWidth',l.strokeWidth,'number','min="1" max="12"')}</div><label class="inline-check"><input type="checkbox" data-bool-prop="groupContents" ${l.groupContents!==false?'checked':''}> Move enclosed items with this group</label>${notesField(l.notes)}<p class="tip">When enabled, moving this outline also moves every box fully enclosed by it.</p>`;
  }

  function pinInspector(p) {
    return `${field('Pin / cavity number','number',p.number)}${field('Function / net name','label',p.label)}<div class="field-row">${selectField('Electrical type','type',p.type,['signal','power','ground','CAN-H','CAN-L','shield','NC','unknown'])}${selectField('Terminal gender','gender',p.gender,['female','male','unknown'])}</div>${selectField('Terminal / contact','terminal',p.terminal,['unknown','socket','blade','bullet','ring','spade','solder','other'])}${selectField('Placement','side',p.side||'auto',['auto','left','right','top','bottom','free'])}<div class="field-row">${field('X offset','offsetX',p.offsetX||'','number','step="1"')}${field('Y offset','offsetY',p.offsetY||'','number','step="1"')}</div>${field('Observed wire color','wireColor',p.wireColor || '#64748b','color')}${notesField(p.notes)}<button type="button" data-back-node>Back to connector</button>`;
  }

  function referenceInspector(item) {
    if (document.querySelector('meta[name="harness-public-build"]')) return '<div class="section-title">Reference images</div><p class="tip">The private photo archive is not included in this public edition. Existing photo references remain in your project export.</p>';
    const images = item.images || [];
    const catalog = referenceCatalog;
    const gallery = images.length ? `<div class="reference-grid">${images.map((img,i)=>`<div class="reference-thumb"><a href="${esc(img.path)}" target="_blank" title="Open full image"><img src="${esc(img.path)}" alt="${esc(img.caption || 'Reference image')}"></a><span class="reference-caption">${esc(img.caption || img.path.split('/').pop())}</span><button type="button" data-remove-image="${i}" title="Remove reference">×</button></div>`).join('')}</div>` : '<p class="tip">No images attached to this item yet.</p>';
    const options = catalog.map(ref=>`<option value="${esc(ref.path)}" data-caption="${esc(ref.label)}">${esc(ref.id ? `${ref.id} · ` : '')}${esc(ref.label)} · ${esc(ref.category)}</option>`).join('');
    return `<div class="section-title">Reference images</div>${gallery}<div class="reference-add"><select data-image-catalog><option value="">Choose archived image…</option>${options}</select><button type="button" data-add-catalog-image>Add</button></div><div class="reference-add"><input data-custom-image-path placeholder="Relative path or image URL"><button type="button" data-add-custom-image>Add link</button></div>`;
  }

  function addReferenceImage(item, path, caption = '') {
    if (!path) return;
    item.images ||= [];
    if (item.images.some(img=>img.path===path)) { setStatus('Image already attached'); return; }
    item.images.push({path,caption:caption || path.split('/').pop()});
    changed('Reference image attached');
  }

  function handleInspectorInput(e, commit = true) {
    const item = selectedItem(); if (!item) return;
    const boolProp = e.target.dataset.boolProp;
    if (boolProp) { item[boolProp] = e.target.checked; changed(`${boolProp} updated`); return; }
    const prop = e.target.dataset.prop;
    if (prop) {
      let value = e.target.value;
      if (e.target.type === 'number') value = Number(value);
      if(prop==='openStart'||prop==='openEnd'){value=clamp(value,0,100);const other=prop==='openStart'?'openEnd':'openStart';item[other]=Math.min(Number(item[other]??10),100-value);}
      if(selected.kind==='pin'&&['side','offsetX','offsetY'].includes(prop))delete item.edgeFraction;
      if(prop==='routing')delete item.waypoints;
      item[prop] = value;
      if (commit) changed(`${prop} updated`);
      else liveCanvasUpdate();
      return;
    }
    const pinId = e.target.dataset.pinLabel;
    if (pinId) {
      const found = findPin(pinId); if (found) found.pin.label = e.target.value;
      if (commit) changed('Pin label updated');
      else liveCanvasUpdate();
    }
  }

  function renumberPins(pins) {
    const alphabetic = pins.length && pins.every(p=>/^[A-Z]+$/i.test(String(p.number||'')));
    const alpha = n => { let s=''; do { s=String.fromCharCode(65+n%26)+s; n=Math.floor(n/26)-1; } while(n>=0); return s; };
    pins.forEach((p,i)=>p.number=alphabetic?alpha(i):String(i+1));
  }

  function reorderPin(sourceId,targetId) {
    const node=selected?.kind==='node'?selectedItem():null; if(!node||sourceId===targetId)return;
    const from=node.pins.findIndex(p=>p.id===sourceId),to=node.pins.findIndex(p=>p.id===targetId); if(from<0||to<0)return;
    const [pin]=node.pins.splice(from,1); node.pins.splice(to,0,pin); renumberPins(node.pins); changed('Pins reordered and renumbered');
  }

  function liveCanvasUpdate() {
    state.project.updated = new Date().toISOString();
    renderLooms(); renderWires(); renderNodes();renderTempWire();
    scheduleSave();
  }

  function deleteSelected() {
    if (!selected) return;
    if(selected.kind==='bundle') {state.wires.forEach(w=>{if(w.bundle===selected.id)delete w.bundle});delete state.project.bundles[selected.id];selected=null;changed('Harness ungrouped; wires preserved');return;}
    if (selected.kind === 'wire') state.wires = state.wires.filter(w => w.id !== selected.id);
    if (selected.kind === 'loom') state.looms = state.looms.filter(l => l.id !== selected.id);
    if (selected.kind === 'node') {
      const node = state.nodes.find(n => n.id === selected.id);
      const pins = new Set(node?.pins.map(p => p.id) || []);
      state.wires = state.wires.filter(w => !pins.has(w.from) && !pins.has(w.to));
      state.nodes = state.nodes.filter(n => n.id !== selected.id);
    }
    if (selected.kind === 'pin') {
      const found = findPin(selected.id);
      if (found) {
        state.wires = state.wires.filter(w => w.from !== selected.id && w.to !== selected.id);
        found.node.pins = found.node.pins.filter(p => p.id !== selected.id);
      }
    }
    selected = null; changed('Selection deleted');
  }

  function setTool(next) {
    tool = next; wireStart = null;
    $$('[data-tool]').forEach(b => b.classList.toggle('active', b.dataset.tool === tool));
    els.toolIndicator.textContent = tool === 'wire' ? 'Click pins or box edges · Alt for exact placement' : 'Select · drag lines / pins · double-click line for bend';
    render();
  }

  function beginWire(pinId) {
    if (!wireStart) { wireStart = pinId; setStatus('Choose destination pin'); render(); return; }
    if (wireStart === pinId) { wireStart = null; render(); return; }
    const duplicate = state.wires.some(w => (w.from === wireStart && w.to === pinId) || (w.from === pinId && w.to === wireStart));
    if (duplicate) { setStatus('Those pins are already connected'); wireStart = null; render(); return; }
    const source = findPin(wireStart);
    const wire = {id: uid('wire'), from: wireStart, to: pinId, label: source?.pin.label || '', color: source?.pin.wireColor || '#e33b32', tracerColor: '', gauge: 18, thickness: 4, length: '', lengthUnit: 'mm', style: 'solid', notes: ''};
    state.wires.push(wire); wireStart = null; selected = {kind: 'wire', id: wire.id}; changed('Wire added');
  }

  function pointerDown(e) {
    const point=screenToWorld(e.clientX,e.clientY);
    if(tool==='select'&&(e.metaKey||e.ctrlKey)){
      const el=e.target.closest('.wire,.node');
      if(el){const s=elementSelection(el),key=selectionKey(s);if(multi.has(key))multi.delete(key);else multi.set(key,s);selected=null;render();}
      else {drag={type:'marquee',start:point};pointerWorld=point;renderTempWire();}
      e.preventDefault();return;
    }
    if(multi.size){multi.clear();renderInspector();multiHighlight();}
    if(drawingShape){drawingShape.points.push(point);renderTempWire();e.preventDefault();return;}
    const handle=e.target.closest('[data-route-index]');
    if(handle&&selected) {
      const item=selectedItem(),key=selected.kind==='bundle'?'route':selected.branch!==undefined?'branch'+selected.branch:'waypoints';
      if(!item[key])item[key]=deep(selected.kind==='bundle'?bundleGeometry(selected.id,state.wires.filter(w=>w.bundle===selected.id)).route:wirePoints(item).slice(1,-1));
      const index=Number(handle.dataset.routeIndex);
      if(e.altKey){if(key!=='route'||item[key].length>2){item[key].splice(index,1);changed('Bend removed')}return;}
      drag={type:'route-handle',item,key,index};e.preventDefault();return;
    }
    const pin = e.target.closest('[data-pin]');
    if (pin && (tool === 'wire' || e.shiftKey)) { e.stopPropagation(); beginWire(pin.dataset.pin); return; }
    if(pin&&tool==='select'){selected={kind:'pin',id:pin.dataset.pin};drag={type:'pin',id:pin.dataset.pin};render();e.preventDefault();return;}
    const bundle=e.target.closest('[data-bundle]');
    if(bundle&&tool==='select') {
      selected={kind:'bundle',id:bundle.dataset.bundle};const item=selectedItem();
      item.route ||= deep(bundleGeometry(selected.id,state.wires.filter(w=>w.bundle===selected.id)).route);
      drag={type:e.shiftKey?'route':'insert-bend',item,key:'route',start:point,points:deep(item.route),index:R.closest(item.route,point).index+1};renderInspector();renderTempWire();e.preventDefault();return;
    }
    const resize = e.target.closest('[data-resize]');
    if (resize) {
      const loom = state.looms.find(l => l.id === resize.dataset.resize); const p = screenToWorld(e.clientX, e.clientY);
      drag = {type: 'loom-resize', id: loom.id, start: p, width: loom.width, height: loom.height, before: snapshot()}; e.preventDefault(); return;
    }
    const nodeEl = e.target.closest('.node');
    if(nodeEl&&tool==='wire') {const node=state.nodes.find(n=>n.id===nodeEl.dataset.id);beginWire(edgePin(node,point,e.altKey));e.preventDefault();return;}
    if (nodeEl && tool === 'select') {
      const node = state.nodes.find(n => n.id === nodeEl.dataset.id); const p = screenToWorld(e.clientX, e.clientY);
      selected = {kind: 'node', id: node.id}; drag = {type: 'node', id: node.id, start: p, x: node.x, y: node.y, before: snapshot()}; render(); e.preventDefault(); return;
    }
    const loomEl = e.target.closest('.loom');
    if (loomEl && tool === 'select') {
      const loom = state.looms.find(l => l.id === loomEl.dataset.id); const p = screenToWorld(e.clientX, e.clientY);
      const members = loom.groupContents===false ? [] : state.nodes.filter(n=>loom.memberIds?loom.memberIds.includes(n.id):n.x>=loom.x&&n.y>=loom.y&&n.x+n.width<=loom.x+loom.width&&n.y+nodeHeight(n)<=loom.y+loom.height).map(n=>({id:n.id,x:n.x,y:n.y}));
      selected = {kind: 'loom', id: loom.id}; drag = {type: 'loom', id: loom.id, start: p, x: loom.x, y: loom.y, members, before: snapshot()}; render(); e.preventDefault(); return;
    }
    const wireEl = e.target.closest('.wire');
    if (wireEl && tool === 'select') {
      const branch=wireEl.dataset.branch;
      selected={kind:'wire',id:wireEl.dataset.id,...(branch!==undefined?{branch:Number(branch)}:{})};const item=selectedItem();
      if(branch!==undefined){const coords=wireEl.querySelector('.wire-hit').getAttribute('d').match(/-?\d+(?:\.\d+)?/g).map(Number),points=[];for(let i=0;i<coords.length;i+=2)points.push({x:coords[i],y:coords[i+1]});const key='branch'+branch;item[key] ||= points.slice(1,-1);drag={type:'insert-bend',item,key,start:point,points:deep(item[key]),index:R.closest(points,point).index};renderInspector();renderTempWire();e.preventDefault();return;}
      renderInspector();renderTempWire();
      const points=wirePoints(item);let bends=points.slice(1,-1);if(!bends.length)bends=[R.at(points,.33),R.at(points,.67)];
      drag={type:'route',item,key:'waypoints',start:point,points:deep(bends)};e.preventDefault();return;
    }
    if (e.button === 1 || e.button === 2 || e.shiftKey || e.altKey || pointerDown.space) {
      drag = {type: 'pan', clientX: e.clientX, clientY: e.clientY, x: state.view.x, y: state.view.y}; e.preventDefault(); return;
    }
    if (e.target === els.svg || e.target === els.grid) { selected = null; render(); }
  }

  function pointerMove(e) {
    pointerWorld = screenToWorld(e.clientX, e.clientY);
    if(drawingShape){renderTempWire();return;}
    if (wireStart) renderTempWire();
    if (!drag) return;
    if(drag.type==='marquee'){renderTempWire();return;}
    if(drag.type==='insert-bend'){if(R.distance(pointerWorld,drag.start)<3)return;drag.item[drag.key]=deep(drag.points);drag.item[drag.key].splice(drag.index,0,{x:e.altKey?pointerWorld.x:snap(pointerWorld.x),y:e.altKey?pointerWorld.y:snap(pointerWorld.y)});renderWires();renderTempWire();return;}
    if(drag.type==='pin') {const f=findPin(drag.id);Object.assign(f.pin,edgePlacement(f.node,pointerWorld,e.altKey));renderWires();renderNodes();return;}
    if(drag.type==='route-handle') {drag.item[drag.key][drag.index]={x:e.altKey?pointerWorld.x:snap(pointerWorld.x),y:e.altKey?pointerWorld.y:snap(pointerWorld.y)};renderWires();renderTempWire();return;}
    if(drag.type==='route') {const dx=pointerWorld.x-drag.start.x,dy=pointerWorld.y-drag.start.y;if(Math.hypot(dx,dy)<2)return;drag.item[drag.key]=drag.points.map(p=>({x:e.altKey?p.x+dx:snap(p.x+dx),y:e.altKey?p.y+dy:snap(p.y+dy)}));renderWires();renderTempWire();return;}
    if (drag.type === 'pan') {
      state.view.x = drag.x + e.clientX - drag.clientX; state.view.y = drag.y + e.clientY - drag.clientY; applyView(); return;
    }
    const p = pointerWorld, dx = p.x - drag.start.x, dy = p.y - drag.start.y;
    if (drag.type === 'node') {
      const item = state.nodes.find(n => n.id === drag.id); item.x = snap(drag.x + dx); item.y = snap(drag.y + dy); renderLooms(); renderWires(); renderNodes(); return;
    }
    if (drag.type === 'loom') {
      const item = state.looms.find(l => l.id === drag.id); item.x = snap(drag.x + dx); item.y = snap(drag.y + dy);
      drag.members.forEach(member=>{const node=state.nodes.find(n=>n.id===member.id);if(node){node.x=snap(member.x+dx);node.y=snap(member.y+dy)}});
      renderLooms();renderWires();renderNodes();return;
    }
    if (drag.type === 'loom-resize') {
      const item = state.looms.find(l => l.id === drag.id); item.width = Math.max(60, snap(drag.width + dx)); item.height = Math.max(60, snap(drag.height + dy)); renderLooms(); return;
    }
  }

  function pointerUp() {
    if (!drag) return;
    if(drag.type==='marquee'){
      const a=drag.start,b=pointerWorld,l=Math.min(a.x,b.x),r=Math.max(a.x,b.x),t=Math.min(a.y,b.y),bot=Math.max(a.y,b.y);
      $$('.node,.wire',els.svg).forEach(el=>{const box=el.getBBox();if(box.x+box.width<l||box.x>r||box.y+box.height<t||box.y>bot)return;const s=elementSelection(el);multi.set(selectionKey(s),s);});
      drag=null;selected=null;render();return;
    }
    if (drag.type !== 'pan') { checkpoint(); scheduleSave(); renderInspector(); }
    else scheduleSave();
    drag = null;
  }

  function zoom(e) {
    e.preventDefault();
    const rect = els.svg.getBoundingClientRect();
    const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
    const old = state.view.zoom;
    const next = clamp(old * Math.exp(-e.deltaY * .0012), .2, 3);
    const wx = (sx - state.view.x) / old, wy = (sy - state.view.y) / old;
    state.view.zoom = next; state.view.x = sx - wx * next; state.view.y = sy - wy * next;
    applyView(); scheduleSave();
  }

  function drawingBounds() {
    const points = [...state.wires.flatMap(w=>[...(w.waypoints||[]),...(w.branch0||[]),...(w.branch1||[])]), ...Object.values(state.project.bundles||{}).flatMap(b=>b.route||[])];
    return [...state.nodes.map(n=>({x:n.x,y:n.y,width:n.width,height:nodeHeight(n)})), ...(state.project.schematicView?[]:state.looms), ...points.map(p=>({...p,width:0,height:0}))];
  }

  function cleanSchematic() {
    if(!state.nodes.length){setStatus('Add components first');return;}
    if(!state.project.cleanOriginal)state.project.cleanOriginal=deep(state);
    setStatus('Arranging components and routing wires…');
    requestAnimationFrame(()=>{
      try {
        window.HarnessLayout.arrange(state.nodes,state.wires,nodeHeight);
        const failed=window.HarnessLayout.route(state.nodes,state.wires,pinPosition,nodeHeight);
        state.project.bundleView=false;state.project.schematicView=true;
        selected=null;syncProjectFields();changed(`Clean schematic: ${state.wires.length-failed.length}/${state.wires.length} wires routed. Crossings are not junctions.${failed.length?' Some routes still need manual adjustment.':''}`);fitView();
      }catch(error){setStatus('Cleanup could not finish. Use Restore original to recover your saved layout.');console.error(error);}
    });
  }

  function fitView() {
    // Keep the viewport calculation shared across automatic layout variants.
    const items = drawingBounds();
    if (!items.length) { state.view = {...state.view, x:0, y:0, zoom:1}; applyView(); return; }
    const minX = Math.min(...items.map(i=>i.x)), minY = Math.min(...items.map(i=>i.y));
    const maxX = Math.max(...items.map(i=>i.x+i.width)), maxY = Math.max(...items.map(i=>i.y+i.height));
    const rect = els.svg.getBoundingClientRect(), pad = 70;
    const z = clamp(Math.min((rect.width-pad*2)/(maxX-minX||1),(rect.height-pad*2)/(maxY-minY||1)),.2,1.5);
    state.view.zoom=z; state.view.x=rect.width/2-(minX+maxX)/2*z; state.view.y=rect.height/2-(minY+maxY)/2*z; applyView(); scheduleSave();
  }

  function selectedEntries(){return multi.size?[...multi.values()]:selected?[selected]:[];}
  let routeAttempt=0;
  function smartRoute(alternate=false){
    if(!state.wires.length){setStatus('Add wires first');return;}
    const mode=$('#routing-priority').value;
    routeAttempt=alternate?routeAttempt+3:0;
    const source=snapshot(),base=routeAttempt;
    $('#smart-route').disabled=true;$('#alternate-route').disabled=true;
    $('#routing-report').textContent='Comparing three routing orders…';
    setTimeout(()=>{
      try{
        const candidates=[];
        for(let i=0;i<3;i++){
          const wires=deep(state.wires),failed=window.HarnessLayout.route(state.nodes,wires,pinPosition,nodeHeight,{mode,attempt:base+i});
          const report=window.HarnessLayout.assess(state.nodes,wires,pinPosition,nodeHeight);
          const penalty=mode==='shortest'?300:mode==='bends'?1200:5000;
          const score=failed.length*1e8+report.blocked*1e8+report.diagonal*1e8+report.overlaps*20000+report.crossings*penalty+report.bends*(mode==='bends'?240:60)+report.length;
          candidates.push({wires,failed,report,score,attempt:base+i});
        }
        const best=candidates.sort((a,b)=>a.score-b.score)[0],r=best.report;
        if(snapshot()!==source){$('#routing-report').textContent='Drawing changed during routing. Try again.';return;}
        if(mode==='strict'&&(best.failed.length||r.crossings||r.overlaps||r.blocked||r.diagonal)){
          $('#routing-report').textContent=`No conflict-free route found in these three attempts; drawing unchanged. ${best.failed.length} unrouted wires, ${r.crossings} crossing pairs, ${r.overlaps} overlapping pairs. Move boxes farther apart or try another route.`;return;
        }
        if(!state.project.cleanOriginal)state.project.cleanOriginal=deep(state);
        state.wires=best.wires;state.project.bundleView=false;multi.clear();selected=null;syncProjectFields();
        changed(`90° routing applied · option ${best.attempt+1}`);fitView();
        $('#routing-report').textContent=`Option ${best.attempt+1}: ${r.crossings} crossing pairs · ${r.overlaps} overlapping pairs · ${r.bends} bends · ${r.length} drawing units. ${best.failed.length} unrouted; ${r.blocked} wires intersect boxes. ${r.crossings||r.overlaps||r.blocked||best.failed.length?'Review conflicts or try another option.':'No detected wire conflicts.'}`;
      }catch(error){$('#routing-report').textContent='Routing failed. Your previous wiring is retained.';console.error(error);}
      finally{$('#smart-route').disabled=false;$('#alternate-route').disabled=false;}
    },30);
  }
  function groupSelection(wiresOnly=false){
    const entries=selectedEntries(),ids=new Set(entries.filter(s=>s.kind==='node').map(s=>s.id));
    const name=$('#group-name').value.trim()||'New group';
    if(wiresOnly){const explicit=new Set(entries.filter(s=>s.kind==='wire').map(s=>s.id));const nodes=state.nodes.filter(n=>ids.has(n.id)),pins=new Set(nodes.flatMap(n=>n.pins.map(p=>p.id)));const wires=state.wires.filter(w=>explicit.has(w.id)||(pins.has(w.from)&&pins.has(w.to)));if(wires.length<2){setStatus('Select at least two wires, or boxes connected by at least two wires');return;}wires.forEach(w=>w.bundle=name);state.project.bundleView=true;selected={kind:'bundle',id:name};}
    else {const nodes=state.nodes.filter(n=>ids.has(n.id));if(nodes.length<2){setStatus('Command/Ctrl-select at least two boxes first');return;}const x=Math.min(...nodes.map(n=>n.x))-30,y=Math.min(...nodes.map(n=>n.y))-45;state.looms.push({id:uid('group'),name,x,y,width:Math.max(...nodes.map(n=>n.x+n.width))-x+30,height:Math.max(...nodes.map(n=>n.y+nodeHeight(n)))-y+30,color:'#718096',strokeWidth:3,groupContents:true,memberIds:[...ids]});state.project.schematicView=false;selected={kind:'loom',id:state.looms.at(-1).id};}
    multi.clear();syncProjectFields();changed(wiresOnly?'Wires bundled':'Boxes grouped');
  }
  function ungroupSelection(){
    const entries=selectedEntries();if(!entries.length){setStatus('Select a group outline, bundle, or grouped items first');return;}
    const nodes=new Set(entries.filter(s=>s.kind==='node').map(s=>s.id));
    entries.forEach(s=>{if(s.kind==='bundle')state.wires.forEach(w=>{if(w.bundle===s.id)delete w.bundle});if(s.kind==='wire'){const w=state.wires.find(w=>w.id===s.id);if(w)delete w.bundle;}});
    state.looms=state.looms.filter(l=>!entries.some(s=>s.kind==='loom'&&s.id===l.id));
    state.looms.forEach(l=>{if(!l.memberIds)l.memberIds=state.nodes.filter(n=>n.x>=l.x&&n.y>=l.y&&n.x+n.width<=l.x+l.width&&n.y+nodeHeight(n)<=l.y+l.height).map(n=>n.id);l.memberIds=l.memberIds.filter(id=>!nodes.has(id));});
    multi.clear();selected=null;changed('Ungrouped; components and wires preserved');
  }
  function compactLayout(lucky=false){
    if(!state.nodes.length)return;
    if(!state.project.cleanOriginal)state.project.cleanOriginal=deep(state);
    const seed=lucky?(state.project.layoutAttempt||0)+1:0;state.project.layoutAttempt=seed;
    const mode=lucky?['rows','columns','hub'][seed%3]:$('#compact-layout').value;
    const memberships=state.looms.map(l=>({l,ids:l.memberIds||state.nodes.filter(n=>n.x>=l.x&&n.y>=l.y&&n.x+n.width<=l.x+l.width&&n.y+nodeHeight(n)<=l.y+l.height).map(n=>n.id)}));
    window.HarnessLayout.compact(state.nodes,state.wires,nodeHeight,mode,seed);
    state.wires.forEach(w=>{delete w.waypoints;delete w.branch0;delete w.branch1;delete w.lane;w.routing='orthogonal';});
    Object.values(state.project.bundles||{}).forEach(b=>delete b.route);
    memberships.forEach(({l,ids})=>{const members=state.nodes.filter(n=>ids.includes(n.id));if(!members.length)return;l.memberIds=ids;l.x=Math.min(...members.map(n=>n.x))-25;l.y=Math.min(...members.map(n=>n.y))-40;l.width=Math.max(...members.map(n=>n.x+n.width))-l.x+25;l.height=Math.max(...members.map(n=>n.y+nodeHeight(n)))-l.y+25;});
    state.project.schematicView=false;multi.clear();selected=null;syncProjectFields();changed(`${mode} layout${lucky?' · variation '+seed:''}. Bundle view preserved; Undo restores the previous arrangement.`);fitView();
  }

  function download(name, content, type) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([content], {type})); a.download = name; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  }

  function safeName() { return (state.project.name || 'harness').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''); }

  function exportJson() { download(`${safeName()}.harness.json`, JSON.stringify(state,null,2), 'application/json'); setStatus('Project JSON exported'); }

  function exportSvg() {
    const clone = els.svg.cloneNode(true); clone.setAttribute('xmlns',SVG_NS);
    const items = drawingBounds();
    if (items.length) {
      const minX=Math.min(...items.map(i=>i.x))-60,minY=Math.min(...items.map(i=>i.y))-60,maxX=Math.max(...items.map(i=>i.x+i.width))+60,maxY=Math.max(...items.map(i=>i.y+i.height))+60;
      clone.setAttribute('viewBox',`${minX} ${minY} ${maxX-minX} ${maxY-minY}`); clone.removeAttribute('width'); clone.removeAttribute('height');
      const vp = clone.querySelector('#viewport'); vp.removeAttribute('transform');
      clone.querySelector('#grid-bg')?.remove(); clone.querySelector('#interaction-layer')?.remove();
    }
    download(`${safeName()}.svg`, new XMLSerializer().serializeToString(clone), 'image/svg+xml'); setStatus('SVG exported');
  }

  function importJson(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try { const data=JSON.parse(reader.result); if(!Array.isArray(data.nodes)||!Array.isArray(data.wires)) throw new Error('Not a Harness Studio project'); state={...initial(),...data}; selected=null; undoStack=[];redoStack=[];syncProjectFields();checkpoint();render();scheduleSave();fitView();setStatus('Project imported'); }
      catch(err){ alert(`Could not import project: ${err.message}`); }
    }; reader.readAsText(file);
  }

  function lightBeeSample() {
    const s = initial();
    s.project.name = '2023 Sur-Ron Light Bee X working harness';
    s.project.starter = 'light-bee-2023';
    s.project.layoutVersion = 3;
    s.project.notes = 'Light Bee-only evidence map based on the supplied 2023 Canada X and Light Bee/L1E diagrams. Sources disagree in places and one source is explicitly only partially verified. Pin letters on the battery/BMS connector are project labels, not confirmed molded cavity numbers. Verify connector face orientation and continuity before energizing.';
    s.project.background = '#f8fafc';
    s.project.bundleView = true;
    const refs = []; // reference photos are not part of the public edition
    const mkPins = defs => defs.map((d, i) => ({...makePins(1)[0], number:d.number || String(i + 1), label:d.label || '', type:d.type || 'signal', side:d.side || 'auto', offsetX:d.offsetX || '', offsetY:d.offsetY || '', wireColor:d.color || '#64748b', tracerColor:d.tracer || '', terminal:'unknown', gender:'unknown', notes:d.notes || ''}));
    const device = (name, symbol, x, y, defs, notes='', width=210, height=120, images=[]) => {
      const n={id:uid('device'),kind:'device',name,symbol,x,y,width,height,color:'#263341',shape:'rounded',shapePoints:'',notes,pins:mkPins(defs),images:(images||[]).filter(Boolean)};
      s.nodes.push(n); return n;
    };
    const connector = (name,x,y,defs,notes='',images=[]) => {
      const n={id:uid('connector'),kind:'connector',name,x,y,width:240,pinCount:defs.length,columns:2,gender:'unknown',view:'wire side',color:'#263341',manufacturer:'',family:'',partNumber:'',terminalSeries:'',shape:'rounded',shapePoints:'',notes,pins:mkPins(defs),images:(images||[]).filter(Boolean)};
      s.nodes.push(n); return n;
    };
    const link = (a, ai, b, bi, label, color='#64748b', thickness=3, notes='', lane='') => s.wires.push({id:uid('wire'),from:a.pins[ai].id,to:b.pins[bi].id,label,color,tracerColor:'',gauge:'',thickness,length:'',lengthUnit:'mm',style:notes.includes('unverified')?'dashed':'solid',routing:'orthogonal',lane,showLabel:false,notes});
    const leftRight = (defs) => defs.map((d,i)=>({...d,side:i<Math.ceil(defs.length/2)?'left':'right',offsetY:50+(i%Math.ceil(defs.length/2))*25}));
    const onSide = (side, defs, start, gap) => defs.map((d,i)=>({...d,side,[side === 'top' || side === 'bottom' ? 'offsetX' : 'offsetY']:start+i*gap}));

    const dashboard = device('Dashboard / instrument panel','display',40,360,onSide('right',[
      {label:'+12 V · black',type:'power',color:'#202020'},{label:'Ground · green',type:'ground',color:'#159447'},
      {label:'RS485a · white/red',type:'RS485',color:'#f5f5f5',tracer:'#d74646'},{label:'RS485b · white/black',type:'RS485',color:'#f5f5f5',tracer:'#202020'},
      {label:'Kickstand · green/blue',color:'#159447',tracer:'#2375d8'},{label:'Speedo · yellow/pink',color:'#e8c51b',tracer:'#d63384'},
      {label:'Left indicator · orange',color:'#e67e22'},{label:'Right indicator · light blue',color:'#63a9e8'}
    ],55,25),'Functions and colors copied from the Light Bee/L1E diagram; validate against the exact X/L1E model and connector orientation.',280,250,[refs[2]]);

    const controllerPins = [
      ...onSide('top',[
        {label:'Speedo · Y/P'},{label:'RS485b · W/B',type:'RS485'},{label:'RS485a · W/R',type:'RS485'},{label:'Brake · G/Y'},
        {label:'Kickstand · G/Bl'},{label:'Tilt · B/Br'},{label:'Ignition · R/B',type:'power'},{label:'BMS comm · purple'},
        {label:'BMS comm · blue/black'},{label:'45 km/h limit · G/B'}
      ],70,92),
      ...onSide('bottom',[
        {label:'Throttle +5 V · R/W',type:'power'},{label:'Throttle ground · B/W',type:'ground'},{label:'Throttle signal · G/W'},
        {label:'Motor phase Y',type:'power'},{label:'Motor phase G',type:'power'},{label:'Motor phase Bl',type:'power'},
        {label:'Hall Bl'},{label:'Hall Y'},{label:'Hall G'},{label:'Hall W'},{label:'Hall R',type:'power'},{label:'Hall B',type:'ground'}
      ],55,76),
      {label:'Battery +',type:'power',side:'right',offsetY:70},{label:'Battery −',type:'ground',side:'right',offsetY:120}
    ];
    const controller = device('Motor controller · functional terminal map','controller',470,500,controllerPins,'Functional terminals reconstructed from the supplied diagrams. This is not an official physical connector cavity map.',1040,170,[refs[0],refs[2]]);
    controller.compactPins = true;

    const bms = connector('Battery/BMS low-voltage connector · 8-position',1570,300,[
      {number:'A',label:'Ground · green',type:'ground',color:'#159447'},
      {number:'B',label:'RS485a · white/red',type:'RS485',color:'#f5f5f5',tracer:'#d74646'},
      {number:'C',label:'RS485b · white/black',type:'RS485',color:'#f5f5f5',tracer:'#202020'},
      {number:'D',label:'60 V · red/black',type:'power',color:'#d74646',tracer:'#202020'},
      {number:'E',label:'Comms · purple',color:'#9b4dca'},{number:'F',label:'Comms · blue/black',color:'#2375d8',tracer:'#202020'},
      {number:'G',label:'45 km/h limit · green/black',color:'#159447',tracer:'#202020'},{number:'H',label:'Unpopulated / unknown',type:'NC'}
    ],'A–H are project-only labels. The supplied photo identifies wire functions but does not prove official cavity numbering or mating-face orientation. The turquoise cut loop is reported as the 45 km/h limiter.',[refs[1],refs[2]]);
    bms.columns=1;
    bms.pins.forEach((pin,i)=>{pin.side='left';pin.offsetY=62+i*27});

    const battery = device('Battery pack · 60 V 32 Ah','battery',1600,630,[
      {label:'Pack +',type:'power',side:'left',offsetY:65,color:'#d74646'},
      {label:'Pack −',type:'ground',side:'left',offsetY:105,color:'#202020'},
      {label:'BMS harness',side:'top',color:'#64748b'}
    ],'Light Bee battery specification shown in the supplied diagrams. Exact pack year/revision must be recorded with measurements.',240,170,[refs[0],refs[2]]);
    const breaker = device('Main switch / circuit breaker','spst',1550,800,[{label:'Battery side',type:'power',side:'right',offsetY:52},{label:'Controller side',type:'power',side:'left',offsetY:52}],'100 A shown in the Light Bee/L1E source; confirm the fitted part.',190,105,[refs[2]]);
    const motor = device('Motor','motor',820,840,onSide('top',[{label:'Phase Y',type:'power'},{label:'Phase G',type:'power'},{label:'Phase Bl',type:'power'},{label:'Hall connector'}],45,48),'Three phase leads plus Hall-sensor harness.',230,150,[refs[0],refs[2]]);
    const hall = connector('Motor Hall-sensor connector',1120,840,[
      {label:'Blue · signal'},{label:'Yellow · signal'},{label:'Green · signal'},{label:'White · signal'},{label:'Red · supply',type:'power'},{label:'Black · return',type:'ground'}
    ],'The source labels this group “Signals, +5 V, −5 V”; the exact assignment of individual signal channels remains to be confirmed.',[refs[0],refs[2]]);
    hall.pins.forEach((pin,i)=>{pin.side='top';pin.offsetX=30+i*36});
    const throttle = device('Throttle potentiometer','throttle',500,840,onSide('top',[
      {label:'+5 V · red/white',type:'power',color:'#d74646',tracer:'#f5f5f5'},
      {label:'Ground · black/white',type:'ground',color:'#202020',tracer:'#f5f5f5'},
      {label:'Signal · green/white',color:'#159447',tracer:'#f5f5f5'}
    ],55,65),'Light Bee throttle colors from supplied Light Bee/L1E source; do not assume other models use the same colors.',240,135,[refs[2]]);

    const brake = device('Brake switch','spst',430,70,onSide('bottom',[{label:'Signal · green/yellow',color:'#159447',tracer:'#e8c51b'},{label:'Ground · black',type:'ground',color:'#202020'}],55,75),'Brake-light wire colors reportedly change across a connector in the 2023 Canada source.',190,100,[refs[0],refs[2]]);
    const side = device('Kickstand switch','kickstand',660,70,onSide('bottom',[{label:'Signal · green/blue',color:'#159447',tracer:'#2375d8'},{label:'Ground · green',type:'ground',color:'#159447'},{label:'+12 V · black',type:'power',color:'#202020'}],45,55),'The Light Bee/L1E source depicts three wires. Do not assume other models use the same kickstand wiring.',200,110,[refs[2]]);
    const tilt = device('Tilt safety sensor','box',900,70,onSide('bottom',[{label:'Signal · black/brown',color:'#202020',tracer:'#7a4a24'},{label:'Ground · green',type:'ground',color:'#159447'},{label:'+12 V · black',type:'power',color:'#202020'}],45,55),'Three-wire tilt safety sensor as shown; behavior and connector cavity order remain unverified.',190,110,[refs[0],refs[2]]);
    const dcdc = device('DC/DC converter · 60 V to 12 V','converter',1125,70,onSide('bottom',[{label:'60 V · red/black',type:'power'},{label:'12 V · black',type:'power'},{label:'Ground · green',type:'ground'}],45,60),'Supplies the low-voltage accessory bus.',210,110,[refs[0],refs[2]]);
    const ignition = device('Ignition key · SPST','spst',1370,70,onSide('bottom',[{label:'Out · red/black',type:'power',color:'#d74646',tracer:'#202020'},{label:'In · red/white',type:'power',color:'#d74646',tracer:'#f5f5f5'}],55,75),'Two-terminal key switch.',190,100,[refs[0],refs[2]]);
    const fuse = device('10 A accessory fuse','box',1600,70,onSide('bottom',[{label:'In · red',type:'power'},{label:'Out · red/white',type:'power'}],50,80),'Accessory/key circuit fuse.',180,90,[refs[0],refs[2]]);
    const horn = device('Horn','box',40,680,onSide('right',[{label:'Ground · green',type:'ground'},{label:'Switch · light green'}],45,30),'Two-wire horn.',150,90,[refs[0],refs[2]]);
    const usb = device('USB port · 5 V','converter',220,680,onSide('right',[{label:'Ground · green',type:'ground'},{label:'+12 V input · black',type:'power'}],45,30),'Source diagrams disagree on 1 A versus 2.4 A USB rating.',180,90,[refs[0],refs[2]]);
    const head = device('Headlight','box',40,820,onSide('right',[{label:'Ground · green',type:'ground'},{label:'+12 V · black',type:'power'}],45,30),'Two-wire headlight in the supplied diagrams.',160,90,[refs[0],refs[2]]);
    const tail = device('Tail / brake light','box',220,820,onSide('right',[{label:'Ground · black',type:'ground'},{label:'Running · white',type:'power'},{label:'Brake · red',type:'power'},{label:'Right · yellow'},{label:'Left · green'}],45,24),'2023 Canada source says yellow and green turn wires were unused and documents color changes across the brake-side connector.',210,145,[refs[0]]);

    link(dashboard,2,controller,2,'RS485a · W/R','#f5f5f5',3,'Verify bus topology and termination.');
    link(dashboard,3,controller,1,'RS485b · W/B','#202020',3,'Verify bus topology and termination.');
    link(bms,1,controller,2,'Battery RS485a · W/R','#f5f5f5',3,'Parallel RS485 bus branch.');
    link(bms,2,controller,1,'Battery RS485b · W/B','#202020',3,'Parallel RS485 bus branch.');
    link(bms,4,controller,7,'BMS comm · purple','#9b4dca');
    link(bms,5,controller,8,'BMS comm · blue/black','#2375d8');
    link(bms,6,controller,9,'45 km/h limit · G/B','#159447',2,'Cut loop shown in supplied photo; legality and controller behavior depend on market/revision.');
    link(brake,0,controller,3,'Brake signal · G/Y','#a9c91a');
    link(tilt,0,controller,5,'Tilt signal · B/Br','#7a4a24');
    link(side,0,controller,4,'Kickstand signal · G/Bl','#2375d8');
    link(dashboard,5,controller,0,'Speed signal · Y/P','#d8b51d');
    link(ignition,0,controller,6,'Ignition · R/B','#d74646',3,'Key output to controller.');
    link(throttle,0,controller,10,'Throttle +5 V · R/W','#d74646');
    link(throttle,1,controller,11,'Throttle ground · B/W','#202020');
    link(throttle,2,controller,12,'Throttle signal · G/W','#159447');
    link(controller,13,motor,0,'Motor phase Y','#e8c51b',7);
    link(controller,14,motor,1,'Motor phase G','#159447',7);
    link(controller,15,motor,2,'Motor phase Bl','#2375d8',7);
    link(controller,16,hall,0,'Hall blue','#2375d8'); link(controller,17,hall,1,'Hall yellow','#e8c51b');
    link(controller,18,hall,2,'Hall green','#159447'); link(controller,19,hall,3,'Hall white','#f5f5f5');
    link(controller,20,hall,4,'Hall supply','#d74646'); link(controller,21,hall,5,'Hall return','#202020');
    link(battery,0,breaker,0,'Battery positive','#d74646',9); link(breaker,1,controller,22,'Switched traction positive','#d74646',9);
    link(battery,1,controller,23,'Battery negative','#202020',9);
    link(bms,3,fuse,0,'Accessory/key fuse feed · 60 V','#d74646',3,'Routing is diagram-derived; verify the exact battery and harness revision.');
    link(fuse,1,ignition,1,'Fused key input · R/W','#d74646'); link(bms,3,dcdc,0,'60 V converter feed · R/B','#d74646',4,'Verify whether feed is switched and fused on the exact revision.');
    link(dcdc,1,usb,1,'Accessory +12 V','#202020'); link(dcdc,1,head,1,'Headlight +12 V','#202020');
    link(dcdc,2,horn,0,'Accessory ground','#159447'); link(dcdc,2,usb,0,'USB ground','#159447'); link(dcdc,2,head,0,'Headlight ground','#159447');
    link(tail,2,brake,0,'Brake lamp trigger · color changes across connector','#d74646',2,'Partially verified 2023 Canada installation note.');

    s.wires.forEach(w=>{
      if(/^Hall /.test(w.label))w.bundle='Motor sensor loom';
      else if(/^Motor phase/.test(w.label))w.bundle='Motor phase loom';
      else if(/RS485|BMS comm|45 km/.test(w.label))w.bundle='Communications loom';
      else if(/Accessory|Headlight/.test(w.label))w.bundle='12 V accessory loom';
    });
    s.looms.push({id:uid('loom'),name:'Front controls and lighting',x:20,y:40,width:400,height:960,color:'#718096',strokeWidth:3,groupContents:true,notes:'Logical grouping; branch lengths remain to be measured.'});
    s.looms.push({id:uid('loom'),name:'Controller and motor',x:450,y:470,width:1040,height:550,color:'#718096',strokeWidth:3,groupContents:true,notes:'Functional map, not physical routing.'});
    s.looms.push({id:uid('loom'),name:'Battery and power',x:1530,y:40,width:340,height:900,color:'#718096',strokeWidth:3,groupContents:true,notes:'Keep traction-voltage wiring physically distinct from signal wiring.'});
    return s;
  }

  function loadStarter(kind) {
    const prompt='Replace the current drawing with the Light Bee starter map? Export first if needed.';
    if (state.nodes.length && !confirm(window.HarnessI18n?.t(prompt)||prompt)) return;
    state=lightBeeSample();selected=null;undoStack=[];redoStack=[];syncProjectFields();checkpoint();render();scheduleSave();setTimeout(fitView);setStatus(`Light Bee starter map loaded`);
  }


  function wireEvents() {
    els.svg.addEventListener('dblclick',e=>{
      if(drawingShape)return;
      const bundle=e.target.closest('[data-bundle]'),wire=e.target.closest('.wire');
      if(!bundle&&!wire)return;
      if(wire?.dataset.branch!==undefined)return;
      const kind=bundle?'bundle':'wire',id=bundle?bundle.dataset.bundle:wire.dataset.id;
      selected={kind,id};const item=selectedItem(),key=bundle?'route':'waypoints';
      let points=bundle?bundleGeometry(id,state.wires.filter(w=>w.bundle===id)).route:wirePoints(item);
      const p=screenToWorld(e.clientX,e.clientY),index=R.closest(points,p).index;
      points=deep(points);points.splice(index+1,0,{x:snap(p.x),y:snap(p.y)});
      item[key]=bundle?points:points.slice(1,-1);changed('Bend added');
    });
    $('#fit').onclick=fitView;
    $('#smart-route').onclick=()=>smartRoute(false);
    $('#alternate-route').onclick=()=>smartRoute(true);
    $('#apply-compact').onclick=()=>compactLayout(false);
    $('#lucky-layout').onclick=()=>compactLayout(true);
    $('#group-items').onclick=()=>groupSelection(false);
    $('#group-wires').onclick=()=>groupSelection(true);
    $('#ungroup-items').onclick=ungroupSelection;
    $('#snap-toggle').onclick=()=>{state.view.snap=!(state.view.snap??true);applyView();scheduleSave();};
    $('#clean-schematic').onclick=cleanSchematic;
    $('#restore-layout').onclick=()=>{if(!state.project.cleanOriginal){setStatus('No cleanup backup yet');return;}const dialog=document.createElement('dialog');dialog.innerHTML='<h2>Restore original project?</h2><p>Edits made after cleanup will be discarded.</p><button data-cancel>Cancel</button> <button data-confirm>Restore original</button>';document.body.append(dialog);dialog.querySelector('[data-cancel]').onclick=()=>dialog.close();dialog.addEventListener('close',()=>dialog.remove());dialog.querySelector('[data-confirm]').onclick=()=>{state=deep(state.project.cleanOriginal);selected=null;syncProjectFields();changed('Original project restored');fitView();dialog.close();};dialog.showModal();};
    $('#grid-toggle').onclick=()=>{state.view.grid=!state.view.grid;$('#grid-toggle').classList.toggle('active',state.view.grid);applyView();scheduleSave()};
    $('#bundle-toggle').onclick=()=>{state.project.bundleView=!state.project.bundleView;$('#bundle-toggle').classList.toggle('active',state.project.bundleView);changed(state.project.bundleView?'Bundle view on':'Bundle view off')};
    $('#canvas-white').onclick=()=>{state.project.background='#fafbfd';syncProjectFields();changed('White canvas selected')};
    $('#canvas-black').onclick=()=>{state.project.background='#0b1016';syncProjectFields();changed('Black canvas selected')};
    els.svg.addEventListener('pointerdown', pointerDown); window.addEventListener('pointermove', pointerMove); window.addEventListener('pointerup', pointerUp); els.svg.addEventListener('wheel', zoom, {passive:false}); els.svg.addEventListener('contextmenu', e=>e.preventDefault());
    $$('[data-tool]').forEach(b=>b.addEventListener('click',()=>setTool(b.dataset.tool)));
    $('#add-connector').onclick=()=>$('#connector-dialog').showModal(); $('#add-device').onclick=()=>$('#device-dialog').showModal(); $('#add-loom').onclick=()=>$('#loom-dialog').showModal();
    $$('.library-grid [data-add-device]').forEach(b=>b.onclick=()=>addDevice({name:b.dataset.addDevice,symbol:b.dataset.symbol,color:'#263341'}));
    $('#connector-form').addEventListener('submit',e=>{if(e.submitter?.value==='cancel')return; e.preventDefault(); const o=Object.fromEntries(new FormData(e.currentTarget));$('#connector-dialog').close();addConnector(o)});
    $('#device-form').addEventListener('submit',e=>{if(e.submitter?.value==='cancel')return;e.preventDefault();const o=Object.fromEntries(new FormData(e.currentTarget));$('#device-dialog').close();addDevice(o)});
    $('#loom-form').addEventListener('submit',e=>{if(e.submitter?.value==='cancel')return;e.preventDefault();const o=Object.fromEntries(new FormData(e.currentTarget));$('#loom-dialog').close();addLoom(o)});
    els.inspector.addEventListener('change',e=>handleInspectorInput(e,true));
    els.inspector.addEventListener('input',e=>handleInspectorInput(e,false));
    let draggedPin='';
    els.inspector.addEventListener('dragstart',e=>{const row=e.target.closest('[data-edit-pin]');if(!row)return;draggedPin=row.dataset.editPin;row.classList.add('dragging');e.dataTransfer.effectAllowed='move'});
    els.inspector.addEventListener('dragover',e=>{const row=e.target.closest('[data-edit-pin]');if(!row||!draggedPin)return;e.preventDefault();$$('.pin-row',els.inspector).forEach(r=>r.classList.toggle('drag-over',r===row))});
    els.inspector.addEventListener('drop',e=>{const row=e.target.closest('[data-edit-pin]');if(!row||!draggedPin)return;e.preventDefault();const source=draggedPin;draggedPin='';reorderPin(source,row.dataset.editPin)});
    els.inspector.addEventListener('dragend',()=>{draggedPin='';$$('.pin-row',els.inspector).forEach(r=>r.classList.remove('dragging','drag-over'))});
    els.inspector.addEventListener('click',e=>{
      if(e.target.hasAttribute('data-clear-multi')){multi.clear();render();return;}
      if(e.target.hasAttribute('data-shorten-multi')){shortenSelection(clamp(Number($('#multi-exit-length').value)||0,0,5000));return;}
      if(e.target.hasAttribute('data-draw-shape')){drawingShape={node:selectedItem(),points:[]};setStatus('Click corners of your outline on the canvas. Enter finishes; Escape cancels.');return;}
      if(e.target.hasAttribute('data-reset-route')){const item=selectedItem();if(selected.branch!==undefined)delete item['branch'+selected.branch];else{delete item.route;delete item.waypoints;}changed('Automatic routing restored');return;}
      if(e.target.dataset.bundleMember){const w=state.wires.find(w=>w.id===e.target.dataset.bundleMember);if(e.target.checked)w.bundle=selected.id;else delete w.bundle;changed('Harness membership updated');return;}
      const node=selected?.kind==='node'?selectedItem():null;
      if(e.target.dataset.selectPin){selected={kind:'pin',id:e.target.dataset.selectPin};render();}
      if(e.target.hasAttribute('data-apply-pin-alignment')&&node){
        const side=node.pinAlignment||'manual';
        if(side==='manual'){setStatus('Manual mode keeps each pin placement');return;}
        node.pins.forEach((pin,i)=>{pin.side=side;pin.edgeFraction=(i+1)/(node.pins.length+1);pin.offsetX='';pin.offsetY='';});
        changed(`All pins aligned ${side}`);
      }
      if(e.target.hasAttribute('data-add-pin')&&node){node.pins.push({...makePins(1)[0],number:String(node.pins.length+1)});changed('Position added');}
      if(e.target.hasAttribute('data-remove-pin')&&node&&node.pins.length){const p=node.pins.pop();state.wires=state.wires.filter(w=>w.from!==p.id&&w.to!==p.id);changed('Position removed');}
      if(e.target.hasAttribute('data-back-node')){const found=findPin(selected.id);if(found)selected={kind:'node',id:found.node.id};render();}
      if(e.target.hasAttribute('data-clear-tracer')){const w=selectedItem();w.tracerColor=e.target.checked?'':'#ffffff';changed('Tracer updated');}
      if(e.target.hasAttribute('data-add-catalog-image')){const item=selectedItem(),sel=els.inspector.querySelector('[data-image-catalog]');const option=sel?.selectedOptions[0];if(item&&sel?.value)addReferenceImage(item,sel.value,option?.dataset.caption||option?.textContent||'');}
      if(e.target.hasAttribute('data-add-custom-image')){const item=selectedItem(),input=els.inspector.querySelector('[data-custom-image-path]');if(item&&input?.value)addReferenceImage(item,input.value.trim());}
      if(e.target.dataset.removeImage!==undefined){const item=selectedItem();if(item?.images){item.images.splice(Number(e.target.dataset.removeImage),1);changed('Reference image removed');}}
    });
    els.deleteSelection.onclick=deleteSelected; $('#undo').onclick=undo;$('#redo').onclick=redo;$('#fit').onclick=fitView;
    $('#grid-toggle').onclick=()=>{state.view.grid=!state.view.grid;$('#grid-toggle').classList.toggle('active',state.view.grid);applyView();scheduleSave()};
    $('#bundle-toggle').onclick=()=>{state.project.bundleView=!state.project.bundleView;$('#bundle-toggle').classList.toggle('active',state.project.bundleView);changed(state.project.bundleView?'Bundle view on':'Bundle view off')};
    $('#canvas-white').onclick=()=>{state.project.background='#fafbfd';syncProjectFields();changed('White canvas selected')};
    $('#canvas-black').onclick=()=>{state.project.background='#0b1016';syncProjectFields();changed('Black canvas selected')};
    els.projectName.addEventListener('change',()=>{state.project.name=els.projectName.value||'Untitled harness';changed('Project renamed');syncProjectFields()});
    els.projectNotes.addEventListener('change',()=>{state.project.notes=els.projectNotes.value;changed('Project notes updated')});
    els.projectBackground.addEventListener('input',()=>{state.project.background=els.projectBackground.value;liveCanvasUpdate()});
    els.projectBackground.addEventListener('change',()=>{state.project.background=els.projectBackground.value;changed('Canvas background updated')});
    $('#save-project').onclick=()=>{localStorage.setItem(STORAGE_KEY,JSON.stringify(state));setStatus('Saved in this browser')};
    $('#export-json').onclick=exportJson;$('#export-svg').onclick=exportSvg;$('#import-json').onchange=e=>{if(e.target.files[0])importJson(e.target.files[0]);e.target.value=''};
    $('#new-project').onclick=()=>{const prompt='Start a new project? Export first if you need a backup.';if(state.nodes.length&&!confirm(window.HarnessI18n?.t(prompt)||prompt))return;state=initial();selected=null;undoStack=[];redoStack=[];syncProjectFields();checkpoint();render();scheduleSave()};
    $('#load-light-sample').onclick=()=>loadStarter('light');
    $('#load-light-sample-empty').onclick=()=>loadStarter('light');
    window.addEventListener('keydown',e=>{
      if(drawingShape&&e.key==='Escape'){drawingShape=null;renderTempWire();setStatus('Outline drawing cancelled');return;}
      if(drawingShape&&e.key==='Enter'){e.preventDefault();const {node,points}=drawingShape;if(points.length<3){setStatus('Draw at least three corners');return;}const x=Math.min(...points.map(p=>p.x)),y=Math.min(...points.map(p=>p.y)),w=Math.max(...points.map(p=>p.x))-x,h=Math.max(...points.map(p=>p.y))-y;if(w<5||h<5){setStatus('Outline needs width and height');return;}node.x=x;node.y=y;node.width=w;node.height=h;node.shape='custom';node.shapePoints=points.map(p=>`${(p.x-x)/w*100},${(p.y-y)/h*100}`).join(' ');drawingShape=null;changed('Custom outline drawn');return;}
      const typing=['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName);
      if(e.code==='Space'&&!typing){pointerDown.space=true;e.preventDefault()}
      if(typing)return;
      if(selected&&['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) {
        e.preventDefault();const step=e.shiftKey?20:1,dx=e.key==='ArrowLeft'?-step:e.key==='ArrowRight'?step:0,dy=e.key==='ArrowUp'?-step:e.key==='ArrowDown'?step:0,item=selectedItem();
        if(selected.kind==='wire'||selected.kind==='bundle') {
          const key=selected.kind==='wire'?(selected.branch!==undefined?'branch'+selected.branch:'waypoints'):'route';let pts=item[key]|| (key==='route'?bundleGeometry(selected.id,state.wires.filter(w=>w.bundle===selected.id)).route:wirePoints(item).slice(1,-1));
          if(!pts.length)pts=[R.at(wirePoints(item),.5)];item[key]=pts.map(p=>({x:p.x+dx,y:p.y+dy}));
        }else if(selected.kind==='node'||selected.kind==='loom'){if(selected.kind==='loom'&&item.groupContents!==false)state.nodes.filter(n=>n.x>=item.x&&n.y>=item.y&&n.x+n.width<=item.x+item.width&&n.y+nodeHeight(n)<=item.y+item.height).forEach(n=>{n.x+=dx;n.y+=dy});item.x+=dx;item.y+=dy;}
        changed('Selection nudged');return;
      }
      if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?redo():undo();return}
      if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();deleteSelected()}
      if(e.key.toLowerCase()==='v')setTool('select');if(e.key.toLowerCase()==='w')setTool('wire');if(e.key.toLowerCase()==='c')$('#connector-dialog').showModal();if(e.key.toLowerCase()==='b')$('#device-dialog').showModal();if(e.key.toLowerCase()==='l')$('#loom-dialog').showModal();if(e.key.toLowerCase()==='f')fitView();if(e.key==='Escape'){wireStart=null;setTool('select')}
    });
    window.addEventListener('keyup',e=>{if(e.code==='Space')pointerDown.space=false});
  }

  function init() {
    wireEvents();
    const saved=localStorage.getItem(STORAGE_KEY);
    if(saved){try{state={...initial(),...JSON.parse(saved)}}catch{state=initial()}}
    // Existing user drawings must never be replaced merely because a starter changed.
    syncProjectFields();checkpoint();render();updateHistoryButtons();
    requestAnimationFrame(fitView);
    fetch('reference-catalog.json', {cache:'no-store'})
      .then(response => {
        if (!response.ok) throw new Error(`Catalog HTTP ${response.status}`);
        return response.json();
      })
      .then(catalog => {
        referenceCatalog = Array.isArray(catalog) ? catalog : [];
        if (selected) renderInspector();
      })
      .catch(error => {
        console.warn('Reference image catalog unavailable:', error.message);
        setStatus('Reference catalog unavailable; relaunch Harness Studio');
      });
  }

  init();
})();
