import"./circle-progress.CgyJpk_m.js";import"./barstatus.CzxN21Ca.js";import"./serveritem.D8ldE6GI.js";import"./Console.CV6ZOeDq.js";import"./PluginsUI.CCgHNbX9.js";import{i as w,r as $}from"./lit-element.CdPzzhzS.js";import{x as n}from"./lit-html.Cs9YtZST.js";import{t as _}from"./custom-element.BhZVzxrc.js";import{n as u}from"./property.a2FlD-39.js";import{r as v}from"./state.Dj2gG79p.js";import{filemanagerapi as x}from"./fetchapi.CXYT3pXQ.js";import"./map.DiiNQ3pp.js";var S=Object.defineProperty,P=Object.getOwnPropertyDescriptor,m=(e,t,r,s)=>{for(var o=s>1?void 0:s?P(t,r):t,a=e.length-1,i;a>=0;a--)(i=e[a])&&(o=(s?i(t,r,o):i(o))||o);return s&&o&&S(t,r,o),o};let h=class extends ${constructor(){super(...arguments),this.serverId=window.selectedServer||"",this._properties=[],this._isLoading=!1,this._error=null}connectedCallback(){super.connectedCallback(),this._loadProperties()}updated(e){e.has("serverId")&&this.serverId&&this._loadProperties()}_getValueType(e){if(e===null)return"null";const t=typeof e;return t==="boolean"||t==="number"?t:"string"}_parseValueByType(e,t){switch(t){case"null":return e===""?null:String(e);case"boolean":return e==="true"||e===!0;case"number":const r=Number(e);return isNaN(r)?0:r;default:return String(e)}}async _loadProperties(){const e=this.serverId||window.localStorage.getItem("selectedServer");if(!e){this._error="Server ID not provided.",this._properties=[];return}this._isLoading=!0,this._error=null;try{const t=`/${e}/server.properties`;console.log("filepath",t);const r=await x.readFileByPath(t);if(!r.success||!r.data)throw new Error(r.error||"Failed to read file");let s={};const o=typeof r.data=="string"?r.data:r.data.content;typeof o=="string"&&(s=o.split(`
`).reduce((i,d)=>{if(!d.startsWith("#")&&d.includes("=")){const[c,y]=d.split("=");i[c.trim()]=y.trim()}return i},{}));const a=[];for(const[i,d]of Object.entries(s)){let c=this._getValueType(d),y=d;c==="null"&&(y=""),i==="server-ip"&&c!=="string"&&(c="string"),a.push({key:i,value:d,originalType:c,displayValue:y})}this._properties=a}catch(t){console.error("Error loading properties:",t),this._error=`Error loading properties: ${t instanceof Error?t.message:String(t)}`,this._properties=[]}finally{this._isLoading=!1}}_renderInput(e){switch(e.originalType){case"boolean":return n`
                    <label class="switch">
                        <input 
                            type="checkbox" 
                            .checked=${e.displayValue===!0||String(e.displayValue).toLowerCase()==="true"}
                            data-key=${e.key}
                            data-type=${e.originalType}
                        >
                        <span class="slider round"></span>
                    </label>`;case"number":return n`
                    <input 
                        type="number" 
                        .value=${String(e.displayValue)} 
                        data-key=${e.key}
                        data-type=${e.originalType}
                    >`;case"null":return n`
                    <input 
                        type="text" 
                        .value=${e.displayValue} 
                        placeholder="(null)"
                        data-key=${e.key}
                        data-type=${e.originalType}
                    >`;default:return n`
                    <input 
                        type="text" 
                        .value=${String(e.displayValue)} 
                        data-key=${e.key}
                        data-type=${e.originalType}
                    >`}}_getPropertiesToSave(){const e={};return this.shadowRoot?.querySelectorAll("input[data-key]")?.forEach(r=>{const s=r,o=s.dataset.key,a=s.dataset.type;let i;s.type==="checkbox"?i=s.checked:i=s.value,e[o]=this._parseValueByType(i,a)}),e}async _emitPropertiesChange(){const e=this._getPropertiesToSave(),t=this.serverId||window.localStorage.getItem("selectedServer");if(Object.keys(e).length===0&&!this._properties.length){console.log("No properties to save or loaded.");return}this.dispatchEvent(new CustomEvent("save-success",{bubbles:!0,composed:!0,detail:{server:t,result:e}})),console.log("save-success emitted with:",{server:t,result:e});try{const r=Object.entries(e).map(([o,a])=>`${o}=${a}`).join(`
`);if(!t){console.warn("currentServerId not provided");return}const s=await x.writeFile({directoryname:t,filename:"server.properties",content:r});console.log("result",s)}catch(r){console.error("Error saving properties:",r)}}render(){return this._isLoading?n`<div class="loading-message">Loading properties...</div>`:this._error?n`<div class="error-message">${this._error}</div>`:!this._properties.length&&!this.serverId&&!window.localStorage.getItem("selectedServer")?n`<p>Please provide a 'server-id' attribute or set 'selectedServer' in localStorage.</p>`:this._properties.length?n`
            <table>
                <thead>
                    <tr>
                        <th>Property</th>
                        <th>Value</th>
                    </tr>
                </thead>
                <tbody>
                    ${this._properties.map(e=>n`
                        <tr>
                            <td>${e.key}</td>
                            <td>${this._renderInput(e)}</td>
                        </tr>
                    `)}
                </tbody>
            </table>
            <button 
                id="save-btn" 
                class="primary-btn" 
                @click=${this._emitPropertiesChange}
                ?hidden=${this._properties.length===0}
            >
                Save Properties
            </button>
        `:n`<p>No properties found or loaded for server: ${this.serverId||window.localStorage.getItem("selectedServer")}.</p>`}};h.styles=w`
        :host {
            width: 100%;
            border-radius: 8px;
            box-sizing: border-box;
            color-scheme: light dark; /* Adapts to system theme */
            display: block; /* Good default for custom elements */
        }
        .hidden {
            display: none;
        }
        .primary-btn {
            padding: 8px 16px;
            background: #007bff;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            margin-top: 10px;
        }
        .primary-btn:hover {
            background: #0056b3;
        }
        .switch {
            position: relative;
            display: inline-block;
            width: 60px;
            height: 34px;
        }
        .switch input {
            opacity: 0;
            width: 0;
            height: 0;
        }
        .slider {
            position: absolute;
            cursor: pointer;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: #ccc;
            transition: .4s;
        }
        .slider:before {
            position: absolute;
            content: "";
            height: 26px;
            width: 26px;
            left: 4px;
            bottom: 4px;
            background-color: white;
            transition: .4s;
        }
        input:checked + .slider {
            background-color: #2196F3;
        }
        input:checked + .slider:before {
            transform: translateX(26px);
        }
        .slider.round {
            border-radius: 34px;
        }
        .slider.round:before {
            border-radius: 50%;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
            border: 1px solid var(--table-border-color, rgba(46, 62, 83, 0.5)); /* CSS Var for theming */
        }
        td {
            padding: 8px;
            border: 1px solid var(--table-border-color, rgba(46, 62, 83, 0.5));
        }
        input[type="text"], input[type="number"] {
            width: calc(100% - 12px); /* Take padding into account */
            padding: 6px;
            box-sizing: border-box;
            border: 1px solid var(--input-border-color, #ccc);
            border-radius: 4px;
        }
        .error-message {
            color: red;
            margin-bottom: 10px;
        }
        .loading-message {
            padding: 10px;
            text-align: center;
        }
    `;m([u({type:String,attribute:"server-id"})],h.prototype,"serverId",2);m([v()],h.prototype,"_properties",2);m([v()],h.prototype,"_isLoading",2);m([v()],h.prototype,"_error",2);h=m([_("server-properties")],h);var C=Object.defineProperty,D=Object.getOwnPropertyDescriptor,f=(e,t,r,s)=>{for(var o=s>1?void 0:s?D(t,r):t,a=e.length-1,i;a>=0;a--)(i=e[a])&&(o=(s?i(t,r,o):i(o))||o);return s&&o&&C(t,r,o),o};let p=class extends ${constructor(){super(...arguments),this._rawCurrentPath="/",this.data=[],this.sortColumn="name",this.sortDirection="asc",this._headerIcons={name:"↕️",path:"↕️",size:"↕️",lastModified:"↕️"}}get currentPath(){return this.normalizePath(this._rawCurrentPath)}set currentPath(e){const t=this._rawCurrentPath;this._rawCurrentPath=e,this.requestUpdate("currentPath",t)}get processedData(){return(this.data||[]).map(e=>({...e,name:e.name||"Unnamed",path:this.normalizePath(e.path),type:e.type||(e.isDirectory?"directory":"file"),lastModified:e.lastModified||e.modified||new Date().toISOString(),size:e.size===void 0&&(e.type==="file"||!e.isDirectory&&!e.type)?0:e.size}))}updated(e){if(e.has("_rawCurrentPath")){const t=this.currentPath;this._emitEvent("updated",{data:t,path:t})}}normalizePath(e){if(!e)return"/";let t=e.replace(/\/+/g,"/");return t!=="/"&&t.endsWith("/")&&(t=t.slice(0,-1)),!t.startsWith("/")&&!t.startsWith("./")&&(t="/"+t),t===""?"/":t}formatFileSize(e){if(e==null||isNaN(e))return"-";if(e===0)return"0 Bytes";const t=1024,r=["Bytes","KB","MB","GB","TB"],s=Math.floor(Math.log(e)/Math.log(t));return parseFloat((e/Math.pow(t,s)).toFixed(2))+" "+r[s]}formatDate(e){if(!e)return"-";try{const t=new Date(e);if(isNaN(t.getTime()))return"-";const r=t.getFullYear(),s=String(t.getMonth()+1).padStart(2,"0"),o=String(t.getDate()).padStart(2,"0"),a=String(t.getHours()).padStart(2,"0"),i=String(t.getMinutes()).padStart(2,"0");return`${r}-${s}-${o} ${a}:${i}`}catch{return"-"}}_handleDblClick(e){this._emitEvent("selected",{data:e})}_handleContextMenu(e,t){e.preventDefault(),this._emitEvent("menu",{event:e,data:t})}_emitEvent(e,t){this.dispatchEvent(new CustomEvent(e,{detail:t,bubbles:!0,composed:!0}))}get sortedData(){return[...this.processedData].sort((t,r)=>{let s,o;switch(this.sortColumn){case"name":s=t.name.toLowerCase(),o=r.name.toLowerCase();break;case"path":s=t.path.toLowerCase(),o=r.path.toLowerCase();break;case"size":if(t.type==="directory"&&r.type!=="directory")return-1;if(t.type!=="directory"&&r.type==="directory")return 1;s=t.size||0,o=r.size||0;break;case"lastModified":s=new Date(t.lastModified||t.modified||"").getTime(),o=new Date(r.lastModified||r.modified||"").getTime();break;default:s=t.name.toLowerCase(),o=r.name.toLowerCase()}return this.sortDirection==="asc"?s>o?1:s<o?-1:0:s<o?1:s>o?-1:0})}_handleSort(e){this.sortColumn===e?this.sortDirection=this.sortDirection==="asc"?"desc":"asc":(this.sortColumn=e,this.sortDirection="asc"),this._updateHeaderIcons(),this.requestUpdate(),this._emitEvent("sort",{column:this.sortColumn,direction:this.sortDirection})}_updateHeaderIcons(){const e={name:"↕️",path:"↕️",size:"↕️",lastModified:"↕️"};e[this.sortColumn]=this.sortDirection==="asc"?"⬆️":"⬇️",this._headerIcons=e}render(){return n`
      <table>
        <thead>
          <tr>
            <th @click="${()=>this._handleSort("name")}">
              Name ${this._headerIcons.name}
            </th>
            <th @click="${()=>this._handleSort("path")}">
              Path ${this._headerIcons.path}
            </th>
            <th @click="${()=>this._handleSort("size")}">
              Size ${this._headerIcons.size}
            </th>
            <th @click="${()=>this._handleSort("lastModified")}">
              Modified ${this._headerIcons.lastModified}
            </th>
          </tr>
        </thead>
        <tbody>
          ${this.sortedData.map(e=>n`
            <tr
              class="${e.type}"
              tabindex="0" 
              aria-label="File ${e.name}, type ${e.type}"
              @dblclick="${()=>this._handleDblClick(e)}"
              @contextmenu="${t=>this._handleContextMenu(t,e)}"
              @keydown="${t=>{(t.key==="Enter"||t.key===" ")&&this._handleDblClick(e)}}"
            >
              <td>
                <span class="icon">${e.type==="directory"?"📁":"📄"}</span>
                ${e.name}
              </td>
              <td>${e.path}</td>
              <td>${e.type==="directory"?"-":this.formatFileSize(e.size)}</td>
              <td>${this.formatDate(e.lastModified)}</td>
            </tr>
          `)}

        </tbody>
      </table>
    `}};p.styles=w`
    :host {
      display: block;
      font-family: var(--file-explorer-font-family, Arial, sans-serif);
      color: var(--file-explorer-text-color, #ccc);
      background-color: var(--file-explorer-background-color, #1e1e1e);
      border: 1px solid var(--file-explorer-border-color, rgb(46, 62, 83, 0.5));
      overflow-y: auto;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th {
      background-color: var(--file-explorer-header-bg, #2a2d2e);
      color: var(--file-explorer-header-color, #e0e0e0);
      position: sticky;
      top: 0;
      z-index: 1;
    }
    th, td {
      padding: 8px 12px;
      text-align: left;
      border-bottom: 1px solid var(--file-explorer-row-border-color, rgb(46, 62, 83, 0.5));
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    tr:hover {
      background-color: var(--file-explorer-row-hover-bg, #2c313a);
      cursor: pointer;
    }
    .icon {
      width: 20px;
      height: 20px;
      display: inline-block;
      margin-right: 8px;
      vertical-align: middle;
    }
    .directory .icon {
      color: var(--file-explorer-dir-icon-color, #569cd6);
    }
    .file .icon {
      color: var(--file-explorer-file-icon-color, #d4d4d4);
    }
  `;f([u({type:String,attribute:"current-path"})],p.prototype,"_rawCurrentPath",2);f([u({type:Array})],p.prototype,"data",2);f([u({type:String})],p.prototype,"sortColumn",2);f([u({type:String})],p.prototype,"sortDirection",2);f([v()],p.prototype,"_headerIcons",2);p=f([_("file-explorer")],p);var I=Object.defineProperty,M=Object.getOwnPropertyDescriptor,k=(e,t,r,s)=>{for(var o=s>1?void 0:s?M(t,r):t,a=e.length-1,i;a>=0;a--)(i=e[a])&&(o=(s?i(t,r,o):i(o))||o);return s&&o&&I(t,r,o),o};function g(e,t=!1,r=1){if(e==null)return"N/A";if(e===0)return"0 Bytes";const s=t?1e3:1024;if(Math.abs(e)<s)return e+" B";const o=t?["kB","MB","GB","TB","PB","EB","ZB","YB"]:["KiB","MiB","GiB","TiB","PiB","EiB","ZiB","YiB"];let a=-1;const i=10**r;let d=e;do d/=s,++a;while(Math.round(Math.abs(d)*i)/i>=s&&a<o.length-1);return d.toFixed(r)+" "+o[a]}function T(e){if(e==null)return"N/A";if(e===0)return"0 seconds";const t=Math.floor(e/(3600*24)),r=Math.floor(e%(3600*24)/3600),s=Math.floor(e%3600/60),o=Math.floor(e%60),a=[];return t>0&&a.push(t+(t===1?" day":" days")),r>0&&a.push(r+(r===1?" hour":" hours")),s>0&&a.push(s+(s===1?" minute":" minutes")),(o>0||a.length===0)&&a.push(o+(o===1?" second":" seconds")),a.join(", ")}const l={osSectionTitle:"System Information",osName:"Operating System",osBuild:"OS Build",totalRam:"Total RAM",Uptime:"System Uptime",cpuModel:"CPU Model",cpuCores:"CPU Cores",cpuSpeed:"CPU Speed",environmentSectionTitle:"Environment Variables",networkInterfacesSectionTitle:"Network Interfaces",disksSectionTitle:"Disk Usage",diskUnit:"Unit",diskUsed:"Used",diskFree:"Free",diskTotal:"Total",diskPercent:"Usage %",noData:"No system data available.",loadingData:"Loading system data...",errorData:"Error loading system data."};let b=class extends ${constructor(){super(...arguments),this.systemInfo=null}render(){if(!this.systemInfo)return n`<div class="status-message">${l.loadingData}</div>`;if(!this.systemInfo.success||!this.systemInfo.data)return n`<div class="status-message">${this.systemInfo.success===!1?l.errorData:l.noData}</div>`;const e=this.systemInfo.data,t=e.platform||{},r=e.cpu||{},s=e.enviroment||{},o=e.networkInterfaces||{},a=e.rawdisks?e.rawdisks.map(i=>({...i,mountPoint:i.mount||i.fs})):(e.disks||[]).map(i=>({...i,mountPoint:i.filesystem}));return n`
            <div class="system-monitor">
                <div class="system-info">
                    <h3>${l.osSectionTitle}</h3>
                    <p>${l.osName}: ${t.name??"N/A"} ${t.version??""} <sup>${t.arch??""}</sup></p>
                    <p>${l.osBuild}: ${t.release??"N/A"}</p>
                    <p>${l.totalRam}: ${e.totalmem?g(e.totalmem*1024*1024):"N/A"}</p>
                    <p>${l.Uptime}: ${T(e.uptime)}</p>
                    <p>${l.cpuModel}: ${r.model??"N/A"}</p>
                    <p>${l.cpuCores}: ${r.cores??"N/A"} cores</p>
                    <p>${l.cpuSpeed}: ${r.speed?`${r.speed} GHz`:"N/A"}</p>
                </div>

                ${Object.keys(s).length>0?n`
                    <h3>${l.environmentSectionTitle}</h3>
                    <table id="enviroment-table">
                        <colgroup>
                            <col style="width: 30%">
                            <col style="width: 70%">
                        </colgroup>
                        <tbody>
                            ${Object.entries(s).map(([i,d])=>n`
                                <tr>
                                    <th>${i}</th>
                                    <td>${d??"N/A"}</td>
                                </tr>
                            `)}
                        </tbody>
                    </table>
                `:""}

                ${Object.keys(o).length>0?n`
                    <h3>${l.networkInterfacesSectionTitle}</h3>
                    <table id="networks-table">
                        <colgroup>
                            <col style="width: 30%">
                            <col style="width: 70%">
                        </colgroup>
                        <tbody>
                            ${Object.entries(o).map(([i,d])=>n`
                                <tr class="network-ips">
                                    <th>${i}</th>
                                    <td>
                                        ${(d||[]).map(c=>n`
                                            <span>${c.address??"N/A"} <sup>${c.family??""}</sup></span><br>
                                        `)}
                                    </td>
                                </tr>
                            `)}
                        </tbody>
                    </table>
                `:""}

                ${a.length>0?n`
                    <h3>${l.disksSectionTitle}</h3>
                    <table id="disks-table">
                        <colgroup>
                            <col style="width: 20%">
                            <col style="width: 20%">
                            <col style="width: 20%">
                            <col style="width: 20%">
                            <col style="width: 20%">
                        </colgroup>
                        <thead>
                            <tr>
                                <th>${l.diskUnit}</th>
                                <th>${l.diskUsed}</th>
                                <th>${l.diskFree}</th>
                                <th>${l.diskTotal}</th>
                                <th>${l.diskPercent}</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${a.map(i=>n`
                                <tr>
                                    <th>${i.mountPoint??i.fs??i.filesystem??"N/A"}</th>
                                    <td>${g(i.used)}</td>
                                    <td>${g(i.available)}</td>
                                    <td>${g(i.total??i.size)}</td>
                                    <td>${typeof i.use=="number"?`${i.use.toFixed(1)}%`:i.use??"N/A"}</td>
                                </tr>
                            `)}
                        </tbody>
                    </table>
                `:""}
            </div>
        `}};b.styles=w`
        :host {
            display: block;
            font-family: Arial, sans-serif;
            word-wrap: break-word;
        }
        /* ... (resto de tus estilos, parecen estar bien) ... */
        @media (prefers-color-scheme: dark) {
            :host {
                color: #e0e0e0;
                background-color: #1a1a1a;
            }
            table {
                border-color: #404040;
            }
            th, td {
                border-color: #404040;
            }
            th {
                background-color: #2a2a2a;
            }
        }
        @media (prefers-color-scheme: light) {
            :host {
                color: #1a1a1a;
                background-color: #ffffff;
            }
            table {
                border-color: #ddd;
            }
            th, td {
                border-color: #ddd;
            }
            th {
                background-color: #f5f5f5;
            }
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 10px 0;
            table-layout: fixed;
        }
        th, td {
            padding: 8px;
            border: 1px solid; /* relies on media query for color */
            text-align: left;
            vertical-align: top;
        }
        td {
            word-break: break-all;
            overflow-wrap: break-word;
            hyphens: auto;
        }
        #enviroment-table td, .network-ips td {
            word-wrap: break-word;
        }
        .system-info p {
            margin: 8px 0;
        }
        sup {
            font-size: 0.75em;
            vertical-align: super;
        }
        .status-message {
            padding: 20px;
            text-align: center;
            font-style: italic;
        }
    `;k([u({type:Object})],b.prototype,"systemInfo",2);b=k([_("system-monitor-lit")],b);
