import{i as d,r as m}from"./lit-element.CdPzzhzS.js";import{E as h,x as c}from"./lit-html.Cs9YtZST.js";import{t as b}from"./custom-element.BhZVzxrc.js";import{n as p}from"./property.a2FlD-39.js";import{o as u}from"./map.DiiNQ3pp.js";var g=Object.defineProperty,f=Object.getOwnPropertyDescriptor,l=(e,t,i,n)=>{for(var s=n>1?void 0:n?f(t,i):t,a=e.length-1,r;a>=0;a--)(r=e[a])&&(s=(n?r(t,i,s):r(s))||s);return n&&s&&g(t,i,s),s};let o=class extends m{constructor(){super(...arguments),this.elements=[],this.type="plugins"}addElement(e){const t=typeof e=="string"?e:e.name;return this.elements.some(i=>(typeof i=="string"?i:i.name)===t)?!1:(this.elements=[...this.elements,e],!0)}removeElement(e){const t=typeof e=="string"?e:e.name,i=this.elements.length;return this.elements=this.elements.filter(n=>(typeof n=="string"?n:n.name)!==t),this.elements.length<i}_getItemName(e){return typeof e=="string"?e:e.name}_createItemHTML(e,t){const i=this._getItemName(e);if(!i)return console.warn("Item sin nombre:",e),h;const n=!i.toLowerCase().match(/\.jar\..+$/),s=i.replace(/\.jar(\..+)?$/i,"");return c`
        <div class="item" data-item-name="${i}">
          <div class="item-container">
            <label class="switch">
              <input
                type="checkbox"
                .checked=${n}
                data-item-name="${i}"
                data-item-type="${t}"
                aria-label="Toggle ${s}"
              />
              <span class="slider round"></span>
            </label>
            <span class="filename">${s}</span>
          </div>
          <button
            class="dark-btn icon-only"
            data-item-name="${i}"
            data-item-type="${t}"
            aria-label="Delete ${s}"
          >
            <span class="material-symbols-outlined">delete</span>
          </button>
        </div>
      `}_handleToggle(e){const t=e.target;if(!t||t.type!=="checkbox"||!t.dataset.itemName)return;const i=t.dataset.itemName,n=t.dataset.itemType||this.type,s=t.checked;let a;const r=i.toLowerCase().match(/\.jar\..+$/);s?r?a=i.replace(/\.jar\..+$/i,".jar"):a=i:r?a=i:a=i+".disabled",this._emitEvent("toggle",{item:i,type:n,newName:a,state:s})}_handleDelete(e){const t=e.target.closest("button.dark-btn");if(!t||!t.dataset.itemName)return;const i=t.dataset.itemName,n=t.dataset.itemType||this.type;this._emitEvent("delete",{item:i,type:n})}_emitEvent(e,t){this.dispatchEvent(new CustomEvent(e,{detail:t,bubbles:!0,composed:!0}))}render(){return c`
        <link href="/materialSymbols.css" rel="stylesheet" />
        <div
          id="elements-list-container"
          @change=${this._handleToggle}
          @click=${this._handleDelete}
        >
          ${u(this.elements,e=>this._createItemHTML(e,this.type))}
        </div>
      `}};o.styles=d`
      :host {
        display: block;
        width: 100%;
      }
      button {
        appearance: none;
        outline: none;
        border: 0;
        padding: 12px;
        border-radius: 6px;
        color: white;
        font-weight: 500;
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: center;
        font-size: 14pt;
        cursor: pointer;
      }
      button:hover {
        background: var(--bg-dark-accent-light, #333c4a);
      }
      .item {
        background: #222c3a;
        display: flex;
        align-items: center;
        padding-block: 1rem;
        padding-inline: 6px;
        justify-content: space-between;
        width: 100%;
        border-radius: 10px;
        box-sizing: border-box;
      }
      .item-container {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .filename {
        color: white;
        word-break: break-all; /* Evitar desbordamiento con nombres largos */
      }
      .switch {
        position: relative;
        display: inline-block;
        width: 60px;
        height: 28px;
        flex-shrink: 0;
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
        background-color: #e0e0e0;
        transition: .3s;
        border-radius: 34px;
      }
      .slider:before {
        position: absolute;
        content: "";
        height: 20px;
        width: 20px;
        left: 4px;
        bottom: 4px;
        background-color: white;
        transition: .3s;
        border-radius: 50%;
      }
      input:checked + .slider {
        background-color: #2196F3;
      }
      input:checked + .slider:before {
        transform: translateX(32px);
      }
      .dark-btn {
        background-color: transparent;
        color: white;
        border: none;
        padding: 5px 10px;
        cursor: pointer;
      }
      .icon-only {
        padding: 8px;
        line-height: 0;
      }
      .icon-only .material-symbols-outlined {
        font-size: 20px;
      }
      #elements-list-container {
        display: flex;
        flex-direction: column;
        width: 100%;
        gap: 10px;
      }
    `;l([p({type:Array})],o.prototype,"elements",2);l([p({type:String})],o.prototype,"type",2);o=l([b("plugins-ui")],o);
