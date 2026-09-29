import { isArray, isDef, isUndef } from "src/shared/util";
import VNode from "./vnode";
import { PatchModuleFn, PatchOptions, VNodeWithData } from "src/types/vnode";
import { ObjectType } from "src/types/component";

/**
 * 相同情况:
 * 1. <div></div> => <div></div>
 *    复用 div
 * 2. <div id='app'></div> => <div id='hi'></div>
 *    踏 tag 相同，且都有 data 属性
 * 3. 两个文本节点认为是相同的
 *
 * 不相同的情况:
 * 1. 标签不一致 <div></div> => <p></p>
 *  依据 a.tag === b.tag
 * 2. <div id='app'></div> => <div></div>
 *  依据 isDef(a.data) === isDef(b.data)
 */
function sameVnode(a: VNode, b: VNode) {
  return a.key === b.key && a.tag === b.tag && isDef(a.data) === isDef(b.data);
}

/**区分 Element 还是 VNode */
function isRealElement(param: Element | VNode): param is Element {
  return isDef(Reflect.get(param, "nodeType"));
}

const emptyNode: VNode = new VNode("", {}, []);

const hooks = ["create", "activate", "update", "remove", "destroy"] as const;
type h = (typeof hooks)[number];
type r = Record<h, Array<PatchModuleFn>>;

/**根据不同平台创建不同 patch  */
export function createPatchFunction(backend: PatchOptions) {
  const cbs: r = {
    create: [],
    activate: [],
    update: [],
    remove: [],
    destroy: [],
  };
  hooks.forEach((hook) => (cbs[hook] = []));
  const { nodeOps, modules } = backend;

  hooks.forEach((hook) => {
    modules.forEach((module) => {
      module[hook] && module[hook] && cbs[hook]!.push(module[hook]!);
    });
  });

  function invokeCreateHooks(vnode: VNodeWithData) {
    for (let i = 0; i < cbs.create.length; i++) {
      cbs.create[i](emptyNode, vnode);
    }
  }
  function emptyNodeAt(elm: Element) {
    return new VNode(elm.tagName, {}, [], undefined, elm);
  }
  function isPatchable(vnode: VNode) {
    return isDef(vnode.tag);
  }
  function patchVnode(oldVnode: VNode, vnode: VNode) {
    if (oldVnode === vnode) {
      return;
    }
    /**
     * vnode.elm 还未调用 createElm 创建真实 DOM ,也不需要创建，直接复用 oldVnode.elm
     * elm 可能为 Element节点 或者 text节点
     */
    const elm = (vnode.elm = oldVnode.elm!);
    const data = vnode.data;
    const oldCh = oldVnode.children;
    const ch = vnode.children;
    /**
     * 如果 data 存在，那么 oldVnode.data 一定存在，
     * 进入 patchVnode 的条件之一是: isDef(a.data) === isDef(b.data)
     * 则更新标签上的 data
     */
    if (isDef(data) && isPatchable(vnode)) {
      for (let i = 0; i < cbs.update.length; i++) {
        cbs.update[i](oldVnode, vnode);
      }
    }
    if (isUndef(vnode.text)) {
      /** vnode 代表元素节点 */
      if (isDef(oldCh) && isDef(ch)) {
        /**
         * 老节点: <div><p>p1</p><p>p2</p></div>
         * 新节点: <div><p>p2</p>world<span>s1</span></div>
         * 新节点和老节点都有儿子，需要将儿子按顺序逐个比较
         */
        if (oldCh !== ch) {
          updateChildren(elm, oldCh, ch);
        }
      } else if (isDef(ch)) {
        /**
         * 老节点没有儿子: <div></div>
         * 新节点有儿子: <div>hello</div>
         * 只需将新节点的儿子插入 vnode.elm 中即可
         * 新节点还未挂载，所以需要 parentElm 参数
         */
        addVnodes(elm, null, ch, 0, ch.length - 1);
      } else if (isDef(oldCh)) {
        /**
         * 老节点有儿子: <div>hello</div>
         * 新节点没有儿子: <div></div>
         * 只需 vnode.elm 清空子节点
         * 老节点已经挂载过，所以 elm 一定不为空，不需要传入 parentElm 参数
         */
        removeVnodes(oldCh, 0, oldCh.length - 1);
      } else if (isDef(oldVnode.text)) {
        nodeOps.setTextContent(elm, "");
      }
    } else if (oldVnode.text !== vnode.text) {
      /** vnode 代表文本节点 */
      nodeOps.setTextContent(elm, vnode.text);
    }
  }

  function updateChildren(
    parentElm: Node,
    oldCh: Array<VNode | undefined>,
    newCh: Array<VNode>,
    removeOnly?: boolean
  ) {
    const canMove = !removeOnly;

    let refElm: Node | null;
    let oldStartIdx = 0;
    let oldEndIdx = oldCh.length - 1;
    let newStartIdx = 0;
    let newEndIdx = newCh.length - 1;

    let oldStartVnode = oldCh[0];
    let oldEndVnode = oldCh[oldEndIdx];
    let newStartVnode = newCh[0];
    let newEndVnode = newCh[newEndIdx];

    /**
     * 两个链表同时比较，尽可能少的创建节点
     */
    while (oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) {
      if (isUndef(oldStartVnode)) {
        /** 最后一个分支中  oldCh[idxInOld] = undefined; */
        oldStartVnode = oldCh[++oldStartIdx];
      } else if (isUndef(oldEndVnode)) {
        /** 最后一个分支中  oldCh[idxInOld] = undefined; */
        oldEndVnode = oldCh[--oldEndIdx];
      } else if (sameVnode(oldStartVnode, newStartVnode)) {
        /**
         * <div v-if="show">hello<p>p1</p></div>
         * <div v-else>world</div>
         *
         * oldStartVnode 和 newStartVnode 都为文本节点,
         * 则从链表 头部 开始比较
         */
        patchVnode(oldStartVnode, newStartVnode);
        oldStartVnode = oldCh[++oldStartIdx];
        newStartVnode = newCh[++newStartIdx];
      } else if (sameVnode(oldEndVnode, newEndVnode)) {
        /**
         * <div v-if="show"><p>p1</p>hello</div>
         * <div v-else>world</div>
         *
         * oldStartVnode 和 newStartVnode 不是同类型节点，则比较  oldEndVnode 和 newEndVnode
         * oldEndVnode 和 newEndVnode 都为文本节点
         * 则从链表 尾部 开始比较
         */
        patchVnode(oldEndVnode, newEndVnode);
        oldEndVnode = oldCh[--oldEndIdx];
        newEndVnode = newCh[--newEndIdx];
      } else if (sameVnode(oldStartVnode, newEndVnode)) {
        /**
         * <div v-if="show">hello<p>p1</p></div>
         * <div v-else><p>p2</p>world</div>
         *
         * oldStartVnode 和 newStartVnode 不是同类型节点，则比较  oldEndVnode 和 newEndVnode
         * oldEndVnode 和 newEndVnode 也不是同类型节点，则比较
         * oldStartVnode 和 newEndVnode 都为文本节点
         * oldCh 从链表头开始比较 newCh 从链表尾开始比较
         * 注意:每次比较完之后，比较方向会重新计算
         */

        patchVnode(oldStartVnode, newEndVnode);

        /**
         * 这里 referenceNode 是 nodeOps.nextSibling(oldEndVnode.elm!)
         * 而不是直接插入在 parentElm 尾部,因为
         *
         * <div v-if="show">hello<p>p1</p><span>s1</span></div>
         * <div v-else><p>p2</p>world<span>s2</span></div>
         *
         * 会先进入 sameVnode(oldEndVnode, newEndVnode)
         * 然后再进入当前分支，此时剩余比较节点为:
         *
         * <div v-if="show">hello<p>p1</p>[完成比较:<span>s1</span>]</div>
         * <div v-else><p>p2</p>world[完成比较:<span>s2</span]></div>
         *
         * oldStartVnode 指向 hello     oldEndVnode 指向 <p>p1</p>
         * newStartVnode 指向 <p>p2</p>  newEndVnode 指向 world
         *
         * hello 更新为 world 后要插入在 span 前面
         */
        canMove &&
          nodeOps.insertBefore(
            parentElm,
            oldStartVnode.elm!,
            nodeOps.nextSibling(oldEndVnode.elm!)
          );
        oldStartVnode = oldCh[++oldStartIdx];
        newEndVnode = newCh[--newEndIdx];
      } else if (sameVnode(oldEndVnode, newStartVnode)) {
        /**
         * <div v-if="show"><div>p1</div>hello</div>
         * <div v-else>world<p>p2</p></div>
         *
         */
        patchVnode(oldEndVnode, newStartVnode);
        canMove &&
          nodeOps.insertBefore(parentElm, oldEndVnode.elm!, oldStartVnode.elm!);
        oldEndVnode = oldCh[--oldEndIdx];
        newStartVnode = newCh[++newStartIdx];
      } else {
        /**
         * 当前分支以 newCh 为基准,只有进入 sameVnode 后，才会移动 oldCh 指针
         *
         * <div v-if="show"><div>div1</div>hello</div>
         * <div v-else><p>p1</p><span>s1</span></div>
         * 上面分支都不成立后，进入当前分支
         * 在 oldCh 中查找有没有 p,没有，则将 p 插在 div 前面,移动 newStartIdx 指针
         * newStartIdx 指向 span,在 oldCh 中查看有没有 span,没有则将 span 插在 div 前面,移动 newStartIdx 指针
         * newStartIdx > newEndIdx,跳出 while 循环,删除 oldCh 中 [div,hello]
         *
         * <div v-if="show"><span>s1</span>hello<div>d1</div></div>
         * <div v-else><p>p1</p>world</div>
         * p 插入到 span 前,移动 newStartIdx 指针,指向 world 文本节点
         * 在 oldCh 查找是否有文本节点,有,则更新 hello => world,并将 hello 节点处设置为undefined
         * 将 world 插入到 span 之间 => p world span hello div,
         * 移动 newStartIdx 指针
         * newStartIdx > newEndIdx,跳出 while 循环,删除 oldCh 中 [span,hello,div]
         */
        let oldKeyToIdx = createKeyToOldIdx(oldCh, oldStartIdx, oldEndIdx);
        /**
         * 查找 newStartVnode 在 oldCh 中的 sameVnode
         * newStartVnode:<p>p1</p> ,走 findIdxInOld(),在 oldCh 中查找相同的 p 节点
         * newStartVnode:<p key='a'>p1</p>,走 oldKeyToIdx[newStartVnode.key] ,在 olcCh 中通过 oldKeyToIdx 查找相同 key 为'a' 的节点
         */
        let idxInOld = isDef(newStartVnode.key)
          ? oldKeyToIdx[newStartVnode.key]
          : findIdxInOld(newStartVnode, oldCh, oldStartIdx, oldEndIdx);
        if (isUndef(idxInOld)) {
          /** 在 oldCh [oldStartIdx,oldEndIdx) 间没有找到相同节点，则创建新节点*/
          createElm(newStartVnode, parentElm, oldStartVnode.elm, false);
        } else {
          /** 找到复用的节点 */
          let vnodeToMove = oldCh[idxInOld]!;
          if (sameVnode(vnodeToMove, newStartVnode)) {
            /** 更新 vnodeToMove,且将 vnodeToMove 移动到 oldStartVnode前 */
            patchVnode(vnodeToMove, newStartVnode);
            /** 防止数组塌陷，导致循环不准 */
            oldCh[idxInOld] = undefined;
            canMove &&
              nodeOps.insertBefore(
                parentElm,
                vnodeToMove.elm!,
                oldStartVnode.elm!
              );
          } else {
            /**
             * oldStartVnode:<div key="a"></div>
             * newStartVnode:<p key='a'>p1</p>
             * 在 olcCh 中通过 oldKeyToIdx 查找到 key='a' 的节点 div
             * 但 sameVnode()返回 false,所有新建 p 节点
             */
            createElm(newStartVnode, parentElm, oldStartVnode.elm, false);
          }
        }

        newStartVnode = newCh[++newStartIdx];
      }
    }

    if (oldStartIdx > oldEndIdx) {
      /**
       * oldCh 先退出 while 循环，说明 oldCh.length <= newCh.length
       * 则添加 newCh 剩余节点
       *
       * <div v-if="show">hello</div>
       * <div v-else>world<p>p1</p></div>
       * p 标签插在末尾
       *
       * <div v-if="show">hello</div>
       * <div v-else><p>p1</p>world</div>
       * p 标签插在开头
       *
       */
      // 以oldCh 参考点
      // refElm = isUndef(oldStartVnode) ? null : oldStartVnode.elm!;
      // 以 newCh 参考点
      refElm = isUndef(newCh[newEndIdx + 1]) ? null : newCh[newEndIdx + 1].elm!;

      /**添加newCh 剩余节点*/
      addVnodes(parentElm, refElm, newCh, newStartIdx, newEndIdx);
    } else if (newStartIdx > newEndIdx) {
      /**
       * newCh 先退出 while 循环,说明 oldCh.length > newCh.length
       * 则删除 oldCh 剩余节点
       *
       * <div v-if="show">hello<p>p1</p></div>
       * <div v-else>world</div>
       * 修改文本 hello => world,此时 oldStartIdx 为下标1, oldEndIdx 为下标1,都指向 p 节点
       * newStartIdx 为下标1, newEndIdx 为下标0,退出 while 循环,进入当前分支,删除 p
       *
       * <div v-if="show">hello<p>p1</p></div>
       * <div v-else><span>s1</span></div>
       * 将 span 插入 hello 前面，此时 oldStartIdx 为下标0, oldEndIdx 为下标0,都指向 hello 文本节点
       * newStartIdx 为下标1, newEndIdx 为下标0,退出 while 循环，进入当前分支,删除 hello 和 p
       */
      removeVnodes(oldCh, oldStartIdx, oldEndIdx);
    }
  }
  function addVnodes(
    parentElm: Node,
    refElm: Node | null,
    vnodes: VNode[],
    startIdx: number,
    endIdx: number
  ) {
    for (; startIdx <= endIdx; startIdx++) {
      createElm(vnodes[startIdx], parentElm, refElm, false);
    }
  }

  function removeVnodes(
    vnodes: Array<VNode | undefined>,
    startIdx: number,
    endIdx: number
  ) {
    for (; startIdx <= endIdx; startIdx++) {
      const vnode = vnodes[startIdx];
      if (isDef(vnode)) {
        if (isDef(vnode.tag)) {
          removeAndInvokeRemoveHook(vnode);
        } else {
          removeNode(vnode.elm!);
        }
      }
    }
  }
  /** 收集 children 中的 key 节点 */
  function createKeyToOldIdx(
    children: Array<VNode | undefined>,
    beginIdx: number,
    endIdx: number
  ) {
    let map: ObjectType = {};
    for (let i = beginIdx; i <= endIdx; i++) {
      const key = children[i]?.key;
      if (key) {
        map[key] = i;
      }
    }
    return map;
  }
  function findIdxInOld(
    node: VNode,
    oldCh: Array<VNode | undefined>,
    start: number,
    end: number
  ) {
    /** 不需要匹配 end 处节点,一定不相同,因为如果相同，直接走 sameVnode(oldEndVnode, newEndVnode)*/
    for (let i = start; i < end; i++) {
      const c = oldCh[i];
      if (isDef(c) && sameVnode(node, c)) {
        return i;
      }
    }
  }
  function removeAndInvokeRemoveHook(vnode: VNode) {
    removeNode(vnode.elm as Element);
  }
  function removeNode(el: Node) {
    const parent = el.parentNode;
    if (isDef(parent)) {
      nodeOps.removeChild(parent, el);
    }
  }
  /**
   * 1. <body><div id='app'></div></body>
   *      appendChild()直接插入尾部
   * 2. <body><div id='app'></div><div id='ref'></div></body>
   *     insertBefore() #ref 之前
   * 因为逻辑是用 elm  替换 oldElm,可不是随便插入的
   * @param parent
   * @param elm
   * @param ref
   */
  function insert(
    parent: Node | null | undefined,
    elm: Node,
    ref?: Node | null
  ) {
    if (isDef(parent)) {
      if (isDef(ref)) {
        if (nodeOps.parentNode(ref) === parent) {
          nodeOps.insertBefore(parent, elm, ref);
        }
      } else {
        nodeOps.appendChild(parent, elm);
      }
    }
  }

  function createChildren(vnode: VNode, children?: Array<VNode> | null) {
    if (isArray(children)) {
      for (let i = 0; i < children.length; i++) {
        createElm(children[i], vnode.elm!, null, true);
      }
    } else {
    }
  }
  function createComponent(
    vnode: VNode,
    parentElm?: Node | null,
    refElm?: Node | null
  ) {
    /**
     * <my-component></my-component>
     * 当前的 vnode 就是 my-component 对应的 vnode，页面上不会渲染 my-component,
     * 所以当前 vnode 称为 组件的占位vnode
     * 调用 init() 创建 my-component 中定义的 vue 子类，创建的 vue 实例赋值给 vnode.componentInstance
     * 那么当前组件占位vnode就获得了内部的 vue 实例,将 vue 实例的 $el 提取给上一层的 placeholderVnode
     * placeholderVnode 和 parentElm 有父子关系,从而实现真实 DOM 的 appendChild
     */
    let i = vnode.data;

    if (isDef(i) && isDef(i.hook)) {
      let init = i.hook.init;
      init(vnode);
      if (vnode.componentInstance) {
        if (vnode.componentInstance && vnode.componentInstance.$el) {
          vnode.elm = vnode.componentInstance.$el;
          insert(parentElm, vnode.elm!, refElm);
        }
      }
      return true;
    }
  }
  /**
   * 创建真实 DOM  vnode.elm = nodeOps.createElement
   * 并挂载到页面上 insert(parentElm, vnode.elm!, refElm);
   */
  function createElm(
    vnode: VNode,
    parentElm?: Node | null,
    refElm?: Node | null,
    nested?: boolean
  ) {
    vnode.isRootInsert = !nested;

    if (createComponent(vnode, parentElm, refElm)) return;

    const data = vnode.data;
    const children = vnode.children;
    const tag = vnode.tag;

    if (isDef(tag)) {
      /**创建 Element 节点 */
      vnode.elm = vnode.ns
        ? nodeOps.createElementNS(vnode.ns, tag)
        : nodeOps.createElement(tag, vnode);
      /**
       * 模仿 Angular
       *  <div>
       *     <hello><div>Who are you </div></hello>
       *  </div>
       * 在页面上渲染组件标签
       */
      // 删除 if (createComponent(vnode, parentElm, refElm)) return,正常创建 vnode.elm
      // if (vnode.componentOptions) {
      //   // 组件
      //   let vm = new vnode.componentOptions.Ctor();
      //   // vm.$el;
      //   vm.$mount(vnode.elm as Element);
      // } else {
      //   createChildren(vnode, children);
      // }

      /** 所有的 children 挂载到 vnode.elm 上 */
      createChildren(vnode, children);

      if (isDef(data)) {
        invokeCreateHooks(vnode as VNodeWithData);
      }
      /** vnode.elm 挂载到 parentElm 上 */
      insert(parentElm, vnode.elm!, refElm);
    } else if (vnode.isComment) {
    } else {
      /**创建文本节点 */
      vnode.elm = nodeOps.createTextNode(vnode.text!);
      insert(parentElm, vnode.elm, refElm);
    }
  }
  /**
   * 用新的 vnode 替换掉老的节点
   * 初次渲染时 oldVnode 为页面上的DOM元素
   * 以后更新 oldVnode 为VNode节点,比对 oldVnode和vnode
   * vm.$mount('')  && 未配置 el 选项时 oldVnode 为undefined,渲染函数为 createEmptyVNode
   * vnode:渲染函数生成的VNode,一定存在
   */
  return function patch(oldVnode: Element | VNode | undefined, vnode: VNode) {
    if (isUndef(vnode)) {
      return;
    }
    if (isUndef(oldVnode)) {
      /**
       * vm.$mount() 没有传递挂载目标元素, 空挂载时仍然创建 DOM 元素
       * vm.$el = vnode.elm,只是 vnode.elm 没有父 element，所以不在页面上显示而已
       * 一般组件挂载走该分支
       */
      createElm(vnode);
    } else {
      if (!isRealElement(oldVnode) && sameVnode(oldVnode, vnode)) {
        patchVnode(oldVnode, vnode);
      } else {
        if (isRealElement(oldVnode)) {
          /** Element 类型包装成 VNode 类型，统一管理 */
          oldVnode = emptyNodeAt(oldVnode);
        }

        /**获取需要被替换的 Element 的父 Element ，之后就可以用 DOM API 替换掉该元素  */
        const oldElm = oldVnode.elm!;
        const parentElm = nodeOps.parentNode(oldElm);

        /**从根 VNode 创建真实 DOM ，创建完之后，删除原来的 DOM(oldVnode) */
        createElm(vnode, parentElm, nodeOps.nextSibling(oldElm));
        if (isDef(parentElm)) {
          removeVnodes([oldVnode], 0, 0);
        }
      }
    }
    return vnode.elm;
  };
}
