import TUICore, { TUIConstants } from "@tencentcloud/tui-core";
import {
  TUITranslateService,
  TUIConversationService,
  TUIGlobal,
  TUIStore,
  StoreName,
} from "@tencentcloud/chat-uikit-engine";
import { CONV_CREATE_TYPE } from "../../constant";
import { isUniFrameWork } from "../../utils/is-uni";
import createGroupIcon from "../../assets/icon/start-group.svg";
import createC2CIcon from "../../assets/icon/icon-c2c.svg";

export default class TUIConversationServer {
  static instance: TUIConversationServer;
  private onCallParamsMap: Map<String, any>;
  private onCallCallbackMap: Map<String, Function>;
  public constants: typeof TUIConstants;
  constructor() {
    TUICore.registerService(TUIConstants.TUIConversation.SERVICE.NAME, this);
    TUICore.registerExtension(TUIConstants.TUISearch.EXTENSION.SEARCH_MORE.EXT_ID, this);
    this.onCallParamsMap = new Map();
    this.onCallCallbackMap = new Map();
    this.constants = TUIConstants;
  }

  static getInstance(): TUIConversationServer {
    if (!TUIConversationServer.instance) {
      TUIConversationServer.instance = new TUIConversationServer();
    }
    return TUIConversationServer.instance;
  }

  public getOnCallParams(method: String): any {
    return this.onCallParamsMap.get(method);
  }

  public getOnCallCallback(method: String): Function | undefined {
    return this.onCallCallbackMap.get(method);
  }

  public onCall(method: string, params: Object, callback: Function): void {
    this.onCallParamsMap.set(method, params);
    this.onCallCallbackMap.set(method, callback);
    switch (method) {
      case TUIConstants.TUIConversation.SERVICE.METHOD.CREATE_CONVERSATION:
        this.createConversation(params);
        break;
    }
  }

  public onGetExtension(extensionID: string, params: Object) {
    if (extensionID === TUIConstants.TUISearch.EXTENSION.SEARCH_MORE.EXT_ID) {
      const list = [
        {
          weight: 100,
          icon: createC2CIcon,
          text: TUITranslateService.t("TUIConversation.发起单聊"),
          data: {
            name: CONV_CREATE_TYPE.TYPEC2C,
          },
          listener: {
            onClicked: this.createConversation.bind(this),
          },
        },
        {
          weight: 100,
          icon: createGroupIcon,
          text: TUITranslateService.t("TUIConversation.发起群聊"),
          data: {
            name: CONV_CREATE_TYPE.TYPEGROUP,
          },
          listener: {
            onClicked: this.createConversation.bind(this),
          },
        },
      ];
      // 如果 TUIConversation 向 TUISearch 注册的 发起单聊/发起群聊 扩展被使用
      // 则 TUIConversation 中不再展示 TUIConversation 中承担相关功能的 ConversationHeader
      TUIStore.update(StoreName.CUSTOM, "isShowConversationHeader", false);
      return list;
    }
  }

  private createConversation(item: any) {
    // 通知 TUIContact 调用 SelectFriend 组件，进行选人
    TUICore.callService({
      serviceName: TUIConstants.TUIContact.SERVICE.NAME,
      method: TUIConstants.TUIContact.SERVICE.METHOD.SELECT_FRIEND,
      params: {
        title: item.text,
        isRadio: item.data.name !== CONV_CREATE_TYPE.TYPEGROUP,
        isNeedSearch: true,
      },
      callback: async (memberList: Array<any>) => {
        if (!memberList || memberList.length === 0) {
          // 返回上个页面
          return this.routerForward(null);
        }
        if (item.data.name === CONV_CREATE_TYPE.TYPEGROUP) {
          // 选人成员完后，如果是创建群聊，需要创建群组
          this.createGroup(memberList);
        } else {
          const { userID } = memberList[0];
          // 生成会话
          await this.generateConversation(`C2C${userID}`);
          this.routerForward(`C2C${userID}`);
        }
      },
    });
  }

  private createGroup(memberList: Array<any>) {
    // 通知 TUIGroup 调用 CreateGroup 组件，进行建群操作
    TUICore.callService({
      serviceName: TUIConstants.TUIGroup.SERVICE.NAME,
      method: TUIConstants.TUIGroup.SERVICE.METHOD.CREATE_GROUP,
      params: {
        title: TUITranslateService.t("TUIConversation.发起群聊"),
        memberList,
      },
      callback: async (group: any) => {
        let conversationID = null;
        if (group) {
          const { groupID } = group;
          await this.generateConversation(`GROUP${groupID}`);
          conversationID = `GROUP${groupID}`;
        }
        this.routerForward(conversationID);
      },
    });
  }

  private async routerForward(conversationID: string | null): Promise<void> {
    if (isUniFrameWork) {
      await TUIGlobal?.global?.reLaunch({
        url: "/TUIKit/components/TUIConversation/index",
      });
      if (conversationID) {
        TUIGlobal?.global?.navigateTo({
          url: "/TUIKit/components/TUIChat/index",
        });
      }
    }
  }

  private generateConversation(conversationID: string) {
    TUIConversationService.switchConversation(conversationID)
      .then(() => {
        console.warn("打开会话成功");
      })
      .catch((err: any) => {
        console.warn("打开会话失败", err.code, err.msg);
      });
  }
}
