import{backupsapi as x}from"./fetchapi.CXYT3pXQ.js";import{i as F,r as S}from"./lit-element.CdPzzhzS.js";import{T as E,x as m}from"./lit-html.Cs9YtZST.js";import{t as I}from"./custom-element.BhZVzxrc.js";import{n as L}from"./property.a2FlD-39.js";import{e as M,i as O,t as j}from"./directive.CGE4aKEl.js";import{p as R,v as f,r as h,M as w,m as _}from"./directive-helpers.CY_bUdrT.js";/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const z=(e,t,r)=>{const a=new Map;for(let o=t;o<=r;o++)a.set(e[o],o);return a},C=M(class extends O{constructor(e){if(super(e),e.type!==j.CHILD)throw Error("repeat() can only be used in text expressions")}dt(e,t,r){let a;r===void 0?r=t:t!==void 0&&(a=t);const o=[],n=[];let s=0;for(const p of e)o[s]=a?a(p,s):s,n[s]=r(p,s),s++;return{values:n,keys:o}}render(e,t,r){return this.dt(e,t,r).values}update(e,[t,r,a]){const o=R(e),{values:n,keys:s}=this.dt(t,r,a);if(!Array.isArray(o))return this.ut=s,n;const p=this.ut??=[],u=[];let k,D,i=0,l=o.length-1,c=0,d=n.length-1;for(;i<=l&&c<=d;)if(o[i]===null)i++;else if(o[l]===null)l--;else if(p[i]===s[c])u[c]=f(o[i],n[c]),i++,c++;else if(p[l]===s[d])u[d]=f(o[l],n[d]),l--,d--;else if(p[i]===s[d])u[d]=f(o[i],n[d]),h(e,u[d+1],o[i]),i++,d--;else if(p[l]===s[c])u[c]=f(o[l],n[c]),h(e,o[i],o[l]),l--,c++;else if(k===void 0&&(k=z(s,c,d),D=z(p,i,l)),k.has(p[i]))if(k.has(p[l])){const b=D.get(s[c]),y=b!==void 0?o[b]:null;if(y===null){const B=h(e,o[i]);f(B,n[c]),u[c]=B}else u[c]=f(y,n[c]),h(e,o[i],y),o[b]=null;c++}else w(o[l]),l--;else w(o[i]),i++;for(;c<=d;){const b=h(e,u[d+1]);f(b,n[c]),u[c++]=b}for(;i<=l;){const b=o[i++];b!==null&&w(b)}return this.ut=s,_(e,u),E}});var N=Object.defineProperty,U=Object.getOwnPropertyDescriptor,$=(e,t,r,a)=>{for(var o=a>1?void 0:a?U(t,r):t,n=e.length-1,s;n>=0;n--)(s=e[n])&&(o=(a?s(t,r,o):s(o))||o);return a&&o&&N(t,r,o),o};let v=class extends S{constructor(){super(...arguments),this.backups=[],this.showActions=!0}formatFileSize(e){if(e===0)return"0 B";const t=1024,r=["B","KB","MB","GB","TB"],a=Math.floor(Math.log(e)/Math.log(t));return parseFloat((e/Math.pow(t,a)).toFixed(2))+" "+r[a]}formatDate(e){const t=new Date(e);return t.toLocaleDateString()+" "+t.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}getDisplayDate(e){const t=e.created||e.modified||e.createdDate;return this.formatDate(t)}getDisplaySize(e){return e.sizeFormatted?e.sizeFormatted:e.isDirectory?"Directory":this.formatFileSize(e.size)}handleAction(e,t){const r=new CustomEvent("backup-action",{detail:{action:e,item:t},bubbles:!0,composed:!0});this.dispatchEvent(r)}renderBackupItem(e){return m`
            <div class="backup-item">
                <div class="backup-info">
                    <div class="backup-name">
                        <span class="backup-icon">
                            ${e.isDirectory?"📁":"📄"}
                        </span>
                        <div>
                            <div>${e.name}</div>
                            <div class="backup-path">${e.path}</div>
                            ${e.serverName?m`<div class="backup-server">Server: ${e.serverName}</div>`:""}
                        </div>
                    </div>
                    <div class="backup-size">
                        ${this.getDisplaySize(e)}
                    </div>
                    <div class="backup-modified">
                        ${this.getDisplayDate(e)}
                    </div>
                    <div class="backup-status">
                        ${e.isValid!==void 0?m`<span class="status-badge ${e.isValid?"valid":"invalid"}">
                                ${e.isValid?"✓ Valid":"✗ Invalid"}
                            </span>`:""}
                    </div>
                </div>
                
                ${this.showActions?m`
                    <div class="backup-actions">
                        <button 
                            class="action-btn restore-btn"
                            @click=${()=>this.handleAction("restore",e)}
                            title="Restore backup"
                        >
                            Restore
                        </button>
                        <button 
                            class="action-btn download-btn"
                            @click=${()=>this.handleAction("download",e)}
                            title="Download backup"
                        >
                            Download
                        </button>
                        <button 
                            class="action-btn delete-btn"
                            @click=${()=>this.handleAction("delete",e)}
                            title="Delete backup"
                        >
                            Delete
                        </button>
                    </div>
                `:""}
            </div>
        `}render(){return!this.backups||this.backups.length===0?m`
                <div class="backup-container">
                    <div class="empty-state">
                        <div class="empty-icon">📦</div>
                        <h3>No backups found</h3>
                        <p>There are no backup items to display.</p>
                    </div>
                </div>
            `:m`
            <div class="backup-container">
                <div class="backup-header">
                    Backup Items (${this.backups.length})
                </div>
                ${C(this.backups,e=>`${e.path}-${e.name}`,e=>this.renderBackupItem(e))}
            </div>
        `}};v.styles=F`
    :host {
      display: block;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  
      /* Light mode variables */
      --border-color: #e1e5e9;
      --background-header: #f8f9fa;
      --background-hover: #f8f9fa;
      --text-primary: #495057;
      --text-secondary: #6c757d;
      --text-muted: #adb5bd;
      --box-shadow: rgba(0, 0, 0, 0.1);
      --background-color: white;
    }
  
    @media (prefers-color-scheme: dark) {
      :host {
        --border-color: #3a3f44;
        --background-header: #2a2d30;
        --background-hover: #343a40;
        --text-primary: #f1f3f5;
        --text-secondary: #ced4da;
        --text-muted: #868e96;
        --box-shadow: rgba(0, 0, 0, 0.3);
        --background-color: #1e1e1e;
      }
    }
  
    .backup-container {
      border: 1px solid var(--border-color);
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 4px var(--box-shadow);
      background-color: var(--background-color);
    }
  
    .backup-header {
      background-color: var(--background-header);
      padding: 12px 16px;
      border-bottom: 1px solid var(--border-color);
      font-weight: 600;
      color: var(--text-primary);
    }
  
    .backup-item {
      display: flex;
      align-items: center;
      padding: 12px 16px;
      border-bottom: 1px solid var(--border-color);
      transition: background-color 0.2s ease;
      background-color: var(--background-color);
    }
  
    .backup-item:last-child {
      border-bottom: none;
    }
  
    .backup-item:hover {
      background-color: var(--background-hover);
    }
  
    .backup-info {
      flex: 1;
      display: grid;
      grid-template-columns: 2fr 1fr 1fr 1fr 1fr;
      gap: 16px;
      align-items: center;
    }
  
    .backup-name {
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--text-primary);
    }
  
    .backup-icon {
      width: 16px;
      height: 16px;
      opacity: 0.7;
    }
  
    .backup-size,
    .backup-modified {
      font-size: 14px;
      color: var(--text-secondary);
    }
  
    .backup-path {
      font-size: 12px;
      color: var(--text-muted);
      font-family: monospace;
    }

    .backup-server {
      font-size: 11px;
      color: var(--text-muted);
      font-style: italic;
      margin-top: 2px;
    }

    .backup-status {
      display: flex;
      justify-content: center;
    }

    .status-badge {
      padding: 2px 6px;
      border-radius: 12px;
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .status-badge.valid {
      background-color: #d4edda;
      color: #155724;
      border: 1px solid #c3e6cb;
    }

    .status-badge.invalid {
      background-color: #f8d7da;
      color: #721c24;
      border: 1px solid #f5c6cb;
    }

    @media (prefers-color-scheme: dark) {
      .status-badge.valid {
        background-color: #1e4620;
        color: #75b798;
        border: 1px solid #2d5a31;
      }

      .status-badge.invalid {
        background-color: #4a1e1e;
        color: #f5a3a3;
        border: 1px solid #5a2d2d;
      }
    }
  
    .backup-actions {
      display: flex;
      gap: 8px;
      margin-left: 16px;
    }
  
    .action-btn {
      padding: 6px 12px;
      border: 1px solid;
      border-radius: 4px;
      background: var(--background-color);
      cursor: pointer;
      font-size: 12px;
      font-weight: 500;
      transition: all 0.2s ease;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
  
    .action-btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 2px 4px var(--box-shadow);
    }
  
    .action-btn:active {
      transform: translateY(0);
    }
  
    .restore-btn {
      border-color: #28a745;
      color: #28a745;
    }
  
    .restore-btn:hover {
      background-color: #28a745;
      color: white;
    }
  
    .download-btn {
      border-color: #007bff;
      color: #007bff;
    }
  
    .download-btn:hover {
      background-color: #007bff;
      color: white;
    }
  
    .delete-btn {
      border-color: #dc3545;
      color: #dc3545;
    }
  
    .delete-btn:hover {
      background-color: #dc3545;
      color: white;
    }
  
    .empty-state {
      text-align: center;
      padding: 40px 20px;
      color: var(--text-secondary);
    }
  
    .empty-icon {
      font-size: 48px;
      margin-bottom: 16px;
      opacity: 0.5;
    }
  
    @media (max-width: 768px) {
      .backup-info {
        grid-template-columns: 1fr;
        gap: 4px;
      }

      .backup-actions {
        margin-left: 0;
        margin-top: 8px;
      }

      .backup-item {
        flex-direction: column;
        align-items: stretch;
      }

      .backup-status {
        justify-content: flex-start;
        margin-top: 4px;
      }
    }
  `;$([L({type:Array})],v.prototype,"backups",2);$([L({type:Boolean})],v.prototype,"showActions",2);v=$([I("backup-list")],v);const g=document.getElementById("backups_List");async function A(){const e=await x.getBackups();if(console.log("result",e),!e||!e.data)return;const t=e.data;if(!t||t.length===0||!g){console.log("No backups"),g.backups=[];return}return g&&(g.backups=t),e}async function P(e){console.log("backup",e);const t=await x.restoreBackup({backupName:e.filename});return console.log("result",t),t}function T(e){const t="-backup-",r=e.replace(/\.tar\.gz$/,""),a=r.indexOf(t);if(a===-1)return{name:r,date:"",fullFilename:e};const o=r.substring(0,a),n=r.substring(a+t.length);return{name:o,date:n,fullFilename:e}}async function V(){g&&g.addEventListener("backup-action",async e=>{const{action:t,item:r}=e.detail;if(!t||!r)return;let a;switch(t){case"restore":const o={filename:r.name,outputFolderName:T(r.name).name};a=await P(o),console.log("result",a);break;case"download":try{console.log("Downloading backup:",r.name);const n=await x.downloadBackup(r.name);if(console.log("Download successful, blob:",n),n instanceof Blob)Y(n,r.name);else throw console.error("Response is not a Blob:",n),new Error("Invalid response type - expected Blob")}catch(n){console.error("Error downloading backup:",n)}break;case"delete":a=await x.deleteBackup(r.name),console.log("delete",r),A();break;default:console.error("Acción no reconocida",t);break}console.log("action",t,r)})}function Y(e,t){const r=window.URL.createObjectURL(e),a=document.createElement("a");a.href=r,a.download=t,document.body.appendChild(a),a.click(),document.body.removeChild(a),window.URL.revokeObjectURL(r)}document.addEventListener("DOMContentLoaded",()=>{V(),A()});export{A as g};
