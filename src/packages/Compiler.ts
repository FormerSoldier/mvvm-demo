import Watcher from './Watcher';
import Utils from './Utils';

class Compiler {
  vm: any;
  el: any;
  constructor(el: any, vm: any) {
    this.el = this.isElementNode(el) ? el : document.querySelector(el);
    this.vm = vm;
    let fragement = this.createFragement(this.el);
    this.el.appendChild(this.compile(fragement));
  }
  isElementNode(el: any): boolean {
    return el.nodeType === 1;
  }
  createFragement(el: any): DocumentFragment {
    let fragement = document.createDocumentFragment();
    let firstChild;
    while ((firstChild = el.firstChild)) {
      fragement.appendChild(firstChild);
    }
    return fragement;
  }
  isCustomEvent(attr: string): boolean {
    return attr.startsWith('@');
  }
  isBindValue(attr: string): boolean {
    return attr.startsWith(':');
  }
  isModel(attr: string): boolean {
    return attr.startsWith(':model');
  }
  compile(_node: DocumentFragment | ChildNode): DocumentFragment {
    let fragement = document.createDocumentFragment();
    const childNodes = _node.childNodes;
    childNodes.forEach(node => {
      // node type === 1 这里的Node全部视为Element类型
      if (this.isElementNode(node)) {
        const createdNode = document.createElement((node as Element).tagName);

        (node as Element).getAttributeNames().forEach(attr => {
          const attrValue = (node as Element).getAttribute(attr);
          if (this.isModel(attr)) {
            this.resolveModel(createdNode, attrValue, this.vm);
            return;
          }
          if (this.isBindValue(attr)) {
            const [, valueName] = attr.split(':');
            this.resolveBind(createdNode, attrValue, this.vm, valueName);
            return;
          }
          if (this.isCustomEvent(attr)) {
            const [, eventName] = attr.split('@');
            this.resolveEvent(createdNode, attrValue, this.vm, eventName);
            return;
          }
          createdNode.setAttribute(attr, attrValue || '');
        });
        createdNode.appendChild(this.compile(node));
        fragement.appendChild(createdNode);
      } else {
        let content = node.textContent || '';
        const createdNode = document.createTextNode(content);
        if (/\{\{(.+?)\}\}/.test(content)) {
          this.resolveText(createdNode, content, this.vm);
        }
        fragement.appendChild(createdNode);
      }
    });
    return fragement;
  }
  resolveEvent(element: Element, exp: any, instance: any, eventName: string) {
    element.addEventListener(eventName, e => instance[exp].call(instance, e));
  }
  resolveBind(element: Element, exp: any, instance: any, valueName: string) {
    new Watcher(instance, exp, (nVal: string) => {
      console.debug(instance, exp, nVal);
      // @ts-ignore
      element[valueName] = nVal;
    });
    let value = Utils.resolveValue(instance.$data, exp);
    // @ts-ignore
    element[valueName] = value;
  }
  resolveModel(element: Element, exp: any, instance: any) {
    this.resolveBind(element, exp, instance, 'value');
    element.addEventListener('input', e => {
      console.debug(e);
      // @ts-ignore
      let value = e.target.value;
      Utils.setValue(instance.$data, exp, value);
    });
  }
  resolveText(element: Text, content: string, instance: any) {
    const _rawContent = content;
    let reg = /\{\{(.+?)\}\}/;
    let expr: RegExpMatchArray | null;
    function reRenderText() {
      let _content = _rawContent;
      let _expr: RegExpMatchArray | null;

      while ((_expr = _content.match(reg))) {
        _content = _content.replace(
          _expr[0],
          Utils.resolveValue(instance.$data, _expr[1])
        );
      }
      console.log(_content)
      element.textContent = _content;
    }
    while ((expr = content.match(reg))) {
      content = content.replace(
        expr[0],
        Utils.resolveValue(instance.$data, expr[1])
      );
      new Watcher(instance, expr[1], reRenderText);
      element.textContent = content;
    }
  }
}

export default Compiler;
