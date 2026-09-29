/**
 * 用例集：把 Vue 实例传进来即可跑一遍断言，返回 [{ name, pass, actual, expected }]。
 *
 * 分成两份页面共用：
 *   - dev/cases.html      → 跑 src 源码（Vite 转译，改完即时生效）
 *   - dev/_control.html   → 跑 dist/rollup/vue.js（rollup 产物，作为对照组）
 * 两边结果不一致 = Vite 链路问题；两边同样失败 = 源码本身如此。
 */

export async function runCases(Vue) {
  const rows = [];
  const stage = document.createElement("div");
  stage.style.display = "none";
  document.body.appendChild(stage);

  const check = (name, actual, expected) => {
    rows.push({ name, pass: JSON.stringify(actual) === JSON.stringify(expected), actual, expected });
  };
  const mount = (options) => {
    const el = document.createElement("div");
    stage.appendChild(el);
    return new Vue({ ...options, el });
  };

  try {
    // 1. 插值 + 响应式：改 data 后视图更新
    const vm1 = mount({ template: "<p>{{ msg }}</p>", data: { msg: "hello vite" } });
    check("插值渲染", vm1.$el.textContent, "hello vite");
    vm1.msg = "changed";
    await Vue.nextTick();
    check("响应式更新", vm1.$el.textContent, "changed");

    // 2. computed：依赖追踪 + 缓存
    let computedCalls = 0;
    const vm2 = mount({
      template: "<p>{{ upper }}</p>",
      data: { text: "abc" },
      computed: {
        upper() {
          computedCalls++;
          return this.text.toUpperCase();
        },
      },
    });
    check("computed 取值", vm2.$el.textContent, "ABC");
    void vm2.upper;
    void vm2.upper; // 重复读取应命中缓存
    check("computed 缓存", computedCalls, 1);
    vm2.text = "xyz";
    await Vue.nextTick();
    check("computed 更新", vm2.$el.textContent, "XYZ");

    // 3. watch：回调拿到新旧值
    const watched = [];
    const vm3 = mount({
      template: "<p>{{ n }}</p>",
      data: { n: 1 },
      watch: { n(newVal, oldVal) { watched.push([newVal, oldVal]); } },
    });
    vm3.n = 2;
    await Vue.nextTick();
    check("watch 触发", watched, [[2, 1]]);

    // 4. v-if / v-else
    const vm4 = mount({
      template: "<p><b v-if='ok'>yes</b><i v-else>no</i></p>",
      data: { ok: true },
    });
    check("v-if 分支", vm4.$el.querySelector("b")?.textContent, "yes");
    vm4.ok = false;
    await Vue.nextTick();
    check("v-else 切换", vm4.$el.querySelector("i")?.textContent, "no");

    // 5. v-for + 数组变更检测
    const vm5 = mount({
      template: "<ul><li v-for='(item, i) in list' :key='i'>{{ item }}</li></ul>",
      data: { list: ["a", "b"] },
    });
    check("v-for 渲染", texts(vm5.$el, "li"), ["a", "b"]);
    vm5.list.push("c");
    await Vue.nextTick();
    check("数组变更检测", texts(vm5.$el, "li"), ["a", "b", "c"]);

    // 6. 事件 + v-model 双向绑定
    const vm6 = mount({
      template: "<div><input v-model='val' @input='onInput'><p>{{ val }}</p></div>",
      data: { val: "", hits: 0 },
      methods: { onInput() { this.hits++; } },
    });
    const input = vm6.$el.querySelector("input");
    input.value = "typed";
    input.dispatchEvent(new Event("input"));
    await Vue.nextTick();
    check("v-model 同步", vm6.$el.querySelector("p")?.textContent, "typed");
    check("事件处理器", vm6.hits, 1);

    // 7. 组件：全局注册 + props + $emit
    Vue.component("my-child", {
      props: ["label"],
      template: "<button @click=\"$emit('pick', label)\">{{ label }}</button>",
    });
    const vm7 = mount({
      template: "<div><my-child label='ok' @pick='picked = $event'/></div>",
      data: { picked: "" },
    });
    vm7.$el.querySelector("button")?.dispatchEvent(new Event("click"));
    await Vue.nextTick();
    check("组件 props/$emit", vm7.picked, "ok");

    // 8. 模板编译走实体解码（顺带验证 he 的 CJS interop）
    const vm8 = mount({ template: "<p>&lt;b&gt; &amp; &quot;q&quot;</p>" });
    check("实体解码(he)", vm8.$el.textContent, '<b> & "q"');

    // 9. $watch 手动 + immediate
    const vm9 = mount({ template: "<p>{{ a }}</p>", data: { a: 1 } });
    const log = [];
    vm9.$watch("a", (v) => log.push(v), { immediate: true });
    vm9.a = 2;
    await Vue.nextTick();
    check("$watch", log, [1, 2]);

    // 10. 全局 API 存活（注意：这套源码没有给 Vue.version 赋值，故不检查）
    check("Vue.util.defineReactive", typeof Vue.util?.defineReactive === "function", true);
    check("Vue.nextTick", typeof Vue.nextTick === "function", true);
    check("Vue.extend", typeof Vue.extend === "function", true);
    check("Vue.set", typeof Vue.set === "function", true);
  } catch (e) {
    rows.push({ name: "用例执行抛异常", pass: false, actual: (e && e.stack) || String(e), expected: "-" });
  }

  stage.remove();
  return rows;
}

function texts(root, selector) {
  return [...root.querySelectorAll(selector)].map((n) => n.textContent);
}

export function renderResults(rows) {
  const list = document.getElementById("results");
  list.innerHTML = "";
  for (const r of rows) {
    const li = document.createElement("li");
    li.className = r.pass ? "pass" : "fail";
    li.textContent = r.pass
      ? `PASS  ${r.name}`
      : `FAIL  ${r.name}\n      期望 ${JSON.stringify(r.expected)}\n      实际 ${JSON.stringify(r.actual)}`;
    list.appendChild(li);
  }
  const failed = rows.filter((r) => !r.pass);
  document.getElementById("summary").textContent =
    `${rows.length - failed.length}/${rows.length} 通过` +
    (failed.length ? `　未通过：${failed.map((r) => r.name).join("、")}` : "");
}
