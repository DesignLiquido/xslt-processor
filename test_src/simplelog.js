// Copyright 2018 Johannes Wilm
// Copyright 2005-2006 Google
//
// Author: Steffen Meschkat <mesch@google.com>
//
// A very simple logging facility, used in test/xpath.html.
import {
    xmlEscapeText
} from "../src/util.js"


export class Log {

    constructor() {
        this.lines = [];
    }

    static write(s) {
        this.lines.push(xmlEscapeText(s));
        this.show();
    }

    // Writes the given XML with every tag on a new line.
    static writeXML(xml) {
        const s0 = xml.replace(/</g, '\n<');
        const s1 = xmlEscapeText(s0);
        const s2 = s1.replace(/\s*\n(\s|\n)*/g, '<br/>');
        this.lines.push(s2);
        this.show();
    }

    // Writes without any escaping
    static writeRaw(s) {
        this.lines.push(s);
        this.show();
    }

    static clear() {
        const l = this.div();
        l.innerHTML = '';
        this.lines = [];
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
