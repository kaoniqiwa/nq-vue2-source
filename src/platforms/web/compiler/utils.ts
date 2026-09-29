import { makeMap } from "shared/util";

/** 是否是自闭标签 <hr/> <br/> */
export const isUnaryTag = makeMap(
  "area,base,br,col,embed,frame,hr,img,input,isindex,keygen," +
    "link,meta,param,source,track,wbr"
);

/**
 * 有一些双标签可以省略闭合标签，浏览器会自动加上
 * <p>hello =>浏览器渲染成 <p>hello</p>
 */
export const canBeLeftOpenTag = makeMap(
  "colgroup,dd,dt,li,options,p,td,tfoot,th,thead,tr,source"
);
export const isNonPhrasingTag = makeMap(
  "address,article,aside,base,blockquote,body,caption,col,colgroup,dd," +
    "details,dialog,div,dl,dt,fieldset,figcaption,figure,footer,form," +
    "h1,h2,h3,h4,h5,h6,head,header,hgroup,hr,html,legend,li,menuitem,meta," +
    "optgroup,option,param,rp,rt,source,style,summary,tbody,td,tfoot,th,thead," +
    "title,tr,track"
);
