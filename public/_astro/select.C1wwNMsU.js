import{i as h,r as f}from"./lit-element.CdPzzhzS.js";import{T as v,x as a}from"./lit-html.Cs9YtZST.js";import{n as d}from"./property.a2FlD-39.js";import{e as b,i as x,t as S}from"./directive.CGE4aKEl.js";import{o as g}from"./map.DiiNQ3pp.js";/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const m=b(class extends x{constructor(i){if(super(i),i.type!==S.ATTRIBUTE||i.name!=="class"||i.strings?.length>2)throw Error("`classMap()` can only be used in the `class` attribute and must be the only part in the attribute.")}render(i){return" "+Object.keys(i).filter(e=>i[e]).join(" ")+" "}update(i,[e]){if(this.st===void 0){this.st=new Set,i.strings!==void 0&&(this.nt=new Set(i.strings.join(" ").split(/\s/).filter(t=>t!=="")));for(const t in e)e[t]&&!this.nt?.has(t)&&this.st.add(t);return this.render(e)}const s=i.element.classList;for(const t of this.st)t in e||(s.remove(t),this.st.delete(t));for(const t in e){const o=!!e[t];o===this.st.has(t)||this.nt?.has(t)||(o?(s.add(t),this.st.add(t)):(s.remove(t),this.st.delete(t)))}return v}});/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function l(i,e,s){return i?e(i):s?.(i)}var y=Object.defineProperty,c=(i,e,s,t)=>{for(var o=void 0,n=i.length-1,u;n>=0;n--)(u=i[n])&&(o=u(e,s,o)||o);return o&&y(e,s,o),o};class r extends f{constructor(){super(...arguments),this.options=[],this.Values=[],this.multiple=!1,this.grid=!1,this.showEmptyStateMessages=!1,this.isLoading=!1,this.loadingMessage="Cargando opciones...",this.noOptionsMessage="No hay opciones disponibles."}updated(e){if(e.has("multiple")){const s=e.get("multiple");s!==void 0&&this.multiple!==s&&(this.Values=[],this._dispatchChange([]))}(e.has("options")||e.has("Values"))&&this._validateSelection()}_validateSelection(){if(!this.options||this.options.length===0){this.Values.length>0&&(this.Values=[],this._dispatchChange(this.getSelectedOptions()));return}const e=new Set(this.options.map(n=>String(n.value))),t=(Array.isArray(this.Values)?this.Values:[this.Values]).map(String).filter(n=>n!=null),o=t.filter(n=>e.has(n));(o.length!==t.length||this.Values&&o.length!==this.Values.length)&&(this.Values=o,this._dispatchChange(this.getSelectedOptions()))}_handleOptionSelect(e){e&&(this.multiple?this._toggleOption(e):this._selectOption(e))}_toggleOption(e){const s=this.Values.indexOf(e);let t;s===-1?t=[...this.Values,e]:t=this.Values.filter(o=>o!==e),this.Values=t,this._dispatchChange(this.getSelectedOptions())}_selectOption(e){this.Values.length===1&&this.Values[0]===e||(this.Values=[e],this._dispatchChange(this.getSelectedOptions()))}_dispatchChange(e){this.dispatchEvent(new CustomEvent("change",{detail:e,bubbles:!0,composed:!0}))}getSelectedOptions(){if(!this.options||this.options.length===0)return this.multiple?[]:null;const e=new Set(this.Values?.map(String)),s=this.options.filter(t=>e.has(String(t.value)));return this.multiple?s:s[0]||null}setOptions(e){this.options=e||[],this.isLoading=!1,this.requestUpdate()}setSelectedValues(e){const s=Array.isArray(e)?e:e!=null?[String(e)]:[];if(this.options&&this.options.length>0){const t=new Set(this.options.map(o=>String(o.value)));this.Values=s.map(String).filter(o=>t.has(o))}else this.Values=[]}getValue(){return this.multiple?[...this.Values]:this.Values.length>0?this.Values[0]:null}_renderLoadingState(){return a`
      <div class="status-message">
        <div class="loading-spinner"></div>
        ${this.loadingMessage}
      </div>
    `}_renderNoOptionsState(){return a`<div class="status-message">${this.noOptionsMessage}</div>`}}c([d({type:Array})],r.prototype,"options");c([d({type:Array})],r.prototype,"Values");c([d({type:Boolean,reflect:!0})],r.prototype,"multiple");c([d({type:Boolean,reflect:!0})],r.prototype,"grid");c([d({type:Boolean})],r.prototype,"showEmptyStateMessages");c([d({type:Boolean})],r.prototype,"isLoading");c([d({type:String})],r.prototype,"loadingMessage");c([d({type:String})],r.prototype,"noOptionsMessage");class p extends r{static{this.styles=[h`
      :host {
        display: inherit;
        grid-template-columns: inherit;
        grid-template-rows: inherit;
        font-family: Arial, sans-serif;
        border: 0px;
      }

      .select-container {
        border-radius: 4px;
        max-width: var(--enhanced-select-max-width, 300px);
        max-height: 480px;
        overflow-y: auto;
        padding: 8px;
        background-color: var(--enhanced-select-bg-color, #1a202c);
        color: var(--enhanced-select-text-color, #e2e8f0);
      }

      :host([grid]) .select-container {
        max-width: 100%;
      }
      .options-list {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      :host([grid]) .options-list {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
        gap: 8px;
      }

      .option {
        padding: 8px 12px;
        cursor: pointer;
        border-radius: 4px;
        transition: all 0.2s ease;
        border: 3px solid var(--enhanced-select-option-border-color, #2e3e53);
        display: flex;
        align-items: center;
        gap: 8px;
        background-color: var(--enhanced-select-option-bg-color, #222c3a);
        color: var(--enhanced-select-option-text-color, #cbd5e1);
      }

      .option:hover {
        background-color: var(--enhanced-select-option-hover-bg-color, #2e3e53);
        border-color: var(--enhanced-select-option-hover-border-color, #4a5568);
      }

      .option.selected {
        background-color: var(--enhanced-select-option-selected-bg-color, #222c3a);
        color: var(--enhanced-select-option-selected-text-color, #32d583);
        border-color: var(--enhanced-select-option-selected-border-color, #32d583);
        font-weight: 500;
      }

      .option img {
        width: 24px;
        height: 24px;
        object-fit: cover;
        border-radius: 2px;
        flex-shrink: 0;
      }

      .option-label {
        flex-grow: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .option-state {
        font-size: 0.8em;
        opacity: 0.7;
        margin-left: auto;
        flex-shrink: 0;
      }

      /* --- ESTILOS PARA MENSAJES DE ESTADO --- */
      .status-message {
        padding: 16px;
        text-align: center;
        color: var(--enhanced-select-text-color, #e2e8f0); /* Hereda color del texto */
        font-style: italic;
      }
      .loading-spinner {
        border: 4px solid rgba(255, 255, 255, 0.3); /* Color claro con opacidad */
        border-radius: 50%;
        border-top: 4px solid var(--enhanced-select-text-color, #e2e8f0); /* Color principal del texto */
        width: 24px;
        height: 24px;
        animation: spin 1s linear infinite;
        margin: 0 auto 8px auto; /* Centrar y espacio abajo */
      }
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      /* --- FIN ESTILOS PARA MENSAJES DE ESTADO --- */
    `]}_handleOptionClick(e){const t=e.currentTarget.dataset.value;t&&this._handleOptionSelect(t)}render(){return a`
      <div class="select-container">
        <!-- ${this._renderPreview(this.getSelectedOptions())} --> <!-- Comentado, no está implementado -->
        ${l(this.showEmptyStateMessages&&this.isLoading,()=>this._renderLoadingState(),()=>l(this.showEmptyStateMessages&&!this.isLoading&&this.options.length===0,()=>this._renderNoOptionsState(),()=>a`
              <div class="options-list">
                ${this.generateSelectorOptions()}
              </div>`))}
      </div>
    `}generateSelectorOptions(){return!this.options||this.options.length===0?[]:Array.from(g(this.options,e=>{const s=this.Values?.includes(String(e.value)),t=m({option:!0,selected:s});return a`
          <div
            class=${t}
            data-value=${e.value}
            @click=${this._handleOptionClick}
            role="option"
            aria-selected=${s}
            tabindex="0"
          >
            ${l(e.img||e.image,()=>a`<img src="${e.img||e.image}" alt="">`)}
            <span class="option-label">${e.label}</span>
            ${l(e.state,()=>a`<span class="option-state">${e.state}</span>`)}
          </div>
        `}))}_renderPreview(e){}}class O extends r{static{this.styles=[h`
    :host {
      display: block;
    }
    .cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 1rem;
      padding: 1rem;
    }
    .card {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 1rem;
      border: 2px solid #ddd;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.3s ease;
    }
    .card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0,0,0,0.1);
    }
    .card.active {
      border-color: #4a90e2;
      background-color: rgba(74, 144, 226, 0.1);
    }
    .icon {
      width: 64px;
      height: 64px;
      object-fit: contain;
      margin-bottom: 0.5rem;
    }
    .title {
      text-align: center;
      font-weight: 500;
    }

    /* --- ESTILOS PARA MENSAJES DE ESTADO --- */
    .status-message-container { /* Contenedor para centrar en el grid */
        grid-column: 1 / -1; /* Ocupa todas las columnas del grid */
        text-align: center;
        padding: 2rem 0;
    }
    .status-message {
        color: #555; /* Color de texto para el mensaje */
        font-style: italic;
    }
    .loading-spinner {
        border: 4px solid rgba(0, 0, 0, 0.1); /* Color base del spinner */
        border-radius: 50%;
        border-top: 4px solid #4a90e2; /* Color principal del spinner */
        width: 30px;
        height: 30px;
        animation: spin 1s linear infinite;
        margin: 0 auto 10px auto; /* Centrar y espacio abajo */
    }
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
    /* --- FIN ESTILOS PARA MENSAJES DE ESTADO --- */
    `]}selectCard(e){this._handleOptionSelect(e)}render(){return a`
      <div class="cards-grid">
        ${l(this.showEmptyStateMessages&&this.isLoading,()=>a`<div class="status-message-container">${this._renderLoadingState()}</div>`,()=>l(this.showEmptyStateMessages&&!this.isLoading&&this.options.length===0,()=>a`<div class="status-message-container">${this._renderNoOptionsState()}</div>`,()=>this.generateSelectorOptions()))}
      </div>
    `}generateSelectorOptions(){return!this.options||this.options.length===0?[]:Array.from(g(this.options,e=>{const s=this.Values.includes(String(e.value));return a`
          <div
            class="card ${s?"active":""}"
            data-value="${e.value}"
            @click="${()=>this.selectCard(String(e.value))}"
            role="option"
            aria-selected=${s}
            tabindex="0"
          >
            <img class="icon" src="${e.img||e.image||""}" alt="${e.label}" />
            <span class="title">${e.label}</span>
          </div>
        `}))}}class E extends p{static{this.styles=[...p.styles,h`
      .option {
        position: relative;
        overflow: visible;
      }

      .option:not(.installed) {
        opacity: 0.6;
      }

      .option:not(.installed):not(:hover) .option-state {
        display: none;
      }

      .option.installed .option-state {
        color: var(--enhanced-select-option-selected-text-color, #32d583);
        font-weight: 600;
      }

      .option:not(.installed):hover .option-state {
        display: block;
        color: var(--enhanced-select-text-color, #e2e8f0);
        opacity: 0.8;
      }

      .install-button {
        position: absolute;
        right: 8px;
        top: 50%;
        transform: translateY(-50%);
        background: var(--enhanced-select-option-selected-bg-color, #32d583);
        color: white;
        border: none;
        border-radius: 4px;
        padding: 4px 8px;
        font-size: 0.75em;
        cursor: pointer;
        opacity: 0;
        transition: opacity 0.2s ease;
        z-index: 10;
      }

      .option:not(.installed):hover .install-button {
        opacity: 1;
      }

      .install-button:hover {
        background: var(--enhanced-select-option-hover-bg-color, #2e8b57);
      }

      .option.installed .install-button {
        display: none;
      }
    `]}_handleInstallClick(e,s){e.stopPropagation(),this.dispatchEvent(new CustomEvent("install-version",{detail:{version:s},bubbles:!0,composed:!0}))}generateSelectorOptions(){return!this.options||this.options.length===0?[]:Array.from(g(this.options,e=>{const s=this.Values?.includes(String(e.value)),t=e.state==="instalado"||e.state==="installed"||e.state==="true",o=m({option:!0,selected:s,installed:t});return a`
          <div
            class=${o}
            data-value=${e.value}
            @click=${this._handleOptionClick}
            role="option"
            aria-selected=${s}
            tabindex="0"
          >
            ${l(e.img||e.image,()=>a`<img src="${e.img||e.image}" alt="">`)}
            <span class="option-label">${e.label}</span>
            ${l(e.state,()=>a`<span class="option-state">${e.state}</span>`)}
            ${l(!t,()=>a`
              <button 
                class="install-button"
                @click=${n=>this._handleInstallClick(n,String(e.value))}
                title="Instalar ${e.label}"
              >
                Instalar
              </button>
            `)}
          </div>
        `}))}}customElements.define("list-selector",p);customElements.define("version-selector",E);customElements.define("grid-selector",O);export{m as e};
