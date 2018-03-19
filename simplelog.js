// Copyright 2005-2006 Google
//
// Author: Steffen Meschkat <mesch@google.com>
//
// A very simple logging facility, used in test/xpath.html.
import {xmlEscapeText} from "./util.js"

const logging__ = true;

export class Log {
  static write(s) {
    if (logging__) {
      this.lines.push(xmlEscapeText(s));
      this.show();
    }
  }

  // Writes the given XML with every tag on a new line.
  static writeXML(xml) {
    if (logging__) {
      const s0 = xml.replace(/</g, '\n<');
      const s1 = xmlEscapeText(s0);
      const s2 = s1.replace(/\s*\n(\s|\n)*/g, '<br/>');
      this.lines.push(s2);
      this.show();
    }
  }

  // Writes without any escaping
  static writeRaw(s) {
    if (logging__) {
      this.lines.push(s);
      this.show();
    }
  }

  static clear() {
    if (logging__) {
      const l = this.div();
      l.innerHTML = '';
      this.lines = [];
    }
  }

  static show() {
    const l = this.div();
    l.innerHTML += `${this.lines.join('<br/>')}<br/>`;
    this.lines = [];
    l.scrollTop = l.scrollHeight;
  }

  static div() {
    let l = document.getElementById('log');
    if (!l) {
      l = document.createElement('div');
      l.id = 'log';
      l.style.position = 'absolute';
      l.style.right = '5px';
      l.style.top = '5px';
      l.style.width = '250px';
      l.style.height = '150px';
      l.style.overflow = 'auto';
      l.style.backgroundColor = '#f0f0f0';
      l.style.border = '1px solid gray';
      l.style.fontSize = '10px';
      l.style.padding = '5px';
      document.body.appendChild(l);
    }
    return l;
  }
}

Log.lines = [];

// Reimplement the log functions from util.js to use the simple log.
export function xpathLog(msg) {
  Log.write(msg);
}
function xsltLog(msg) {}
function xsltLogXml(msg) {}
