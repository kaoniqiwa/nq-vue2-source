import { GlobalAPI } from "src/types/global-api";
import { initGlobalAPI } from "./global-api";
import Vue from "./instance";

/** 添加全局 API  */
initGlobalAPI(Vue as unknown as GlobalAPI);

export default Vue;
