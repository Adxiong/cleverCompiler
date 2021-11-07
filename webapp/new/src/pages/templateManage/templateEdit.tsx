/*
 * @Descripttion:
 * @version:
 * @Author: Adxiong
 * @Date: 2021-08-04 15:09:22
 * @LastEditors: Adxiong
 * @LastEditTime: 2021-11-08 00:18:37
 */

import { connect } from 'dva';
import React from 'react';
import styles from './styles/templateEdit.less';
import { withRouter } from 'react-router';
import { IRouteComponentProps } from '@umijs/renderer-react';
import { Dispatch } from '@/.umi/plugin-dva/connect';
import { Button, Progress, Spin, Tabs, Tag, Tooltip } from 'antd';
import {
  TemplateConfig,
  TemplateGlobalConfig,
  TemplateInfo,
  TemplateVersion,
  TemplateVersionGit,
  UpdateTemplateVersion,
} from '@/models/template';
import TimeLinePanel from './templateTimeLine';
import Description from '@/components/description/description';
import Markdown from '@/components/markdown/markdown';
import { LeftOutlined } from '@ant-design/icons';
import util from '@/utils/utils';
import * as _ from 'lodash';
import TemplateConfigPanel from './templateConfig';
import CreateTemplateVersion from './createTemplateVersion';
import { ConnectState } from '@/models/connect';
import TemplateAddGlobalConfig from './addTemplateGlobalConfig';
import TemplateGlobalConfigComponent from './templateGlobalConfig';
import { VersionStatus } from '@/models/common';

export interface TemplateEditProps
  extends IRouteComponentProps<{
    id: string;
  }> {
  dispatch: Dispatch;
}

interface State {
  templateInfo: TemplateInfo | null;
  showAddGlobalConfig: boolean;
  currentVersion: TemplateVersion | null;
  savePercent: number;
  updateTimeout: number;
  delTimeout: number;
  delTooltip: string;
  delInterval?: NodeJS.Timeout;
  currentGitId: string;
}

class TemplateEdit extends React.Component<TemplateEditProps, State> {
  constructor(prop: TemplateEditProps) {
    super(prop);
    this.state = {
      templateInfo: null,
      currentVersion: null,
      showAddGlobalConfig: false,
      savePercent: 100,
      delTimeout: 0,
      delTooltip: '',
      currentGitId: "",
      updateTimeout: 0,
    };

    this.afterUpdateGlobalConfigStatus = this.afterUpdateGlobalConfigStatus.bind(this)
    this.onAddGlobalConfig = this.onAddGlobalConfig.bind(this);
    this.onChangeVersion = this.onChangeVersion.bind(this);
    this.onDeleteVersion = this.onDeleteVersion.bind(this);
    this.onPlaceOnFile = this.onPlaceOnFile.bind(this);
    this.afterUpdateConfig = this.afterUpdateConfig.bind(this);
    this.afterUpdateGlobalConfig = this.afterUpdateGlobalConfig.bind(this);
    this.afterDelGlobalConfig = this.afterDelGlobalConfig.bind(this);
    this.onCancelGlobalConfig = this.onCancelGlobalConfig.bind(this);
    this.afterAddGlobalConfig = this.afterAddGlobalConfig.bind(this);
    this.afterCreateVersion = this.afterCreateVersion.bind(this);
    this.onCancelAddVersion = this.onCancelAddVersion.bind(this);
    this.onChangeReadme = this.onChangeReadme.bind(this);
    this.onChangeBuild = this.onChangeBuild.bind(this);
    this.onChangeUpdate = this.onChangeUpdate.bind(this);
    this.afterAddGit = this.afterAddGit.bind(this);
    this.afterDelGit = this.afterDelGit.bind(this);
    this.onChangeGit = this.onChangeGit.bind(this);
  }


  componentDidMount() {
    const id = this.props.match.params.id;

    this.getGitList()

    if (id != 'createTemplate') {
      this.getTemplateInfo(id)
    }
  }

  componentWillUnmount () {
    if (this.state.delInterval) clearInterval(this.state.delInterval)
  }

  onChangeGit (id: string) {
    this.setState({
      currentGitId: id
    })
  }

  getTemplateInfo (id: string) {
    this.props.dispatch({
      type: 'template/getInfo',
      payload: id,
      callback: (info: TemplateInfo) => {
        console.log(info)
        const currentVersion = info.versionList.length ? info.versionList[0] : null
        this.setState({
          templateInfo: info,
          currentVersion,
          currentGitId: currentVersion?.gitList.length ? currentVersion.gitList[0].id : ""
        })
        this.initDelInterval(currentVersion)
      }
    });
  }


  getGitList () {
    this.props.dispatch({
      type: 'git/query',
      callback: () => {
      }
    });
  }

  initDelInterval (version: TemplateVersion | null) {
    clearInterval(this.state.delInterval as unknown as number)
    if (!version || version.status == VersionStatus.placeOnFile) {
      this.setState({
        delTimeout: 0,
        delTooltip: ''
      })
      return
    }
    let delTimeout = 24 * 60 * 60 * 1000 - (new Date().getTime() -  new Date(version!.publishTime).getTime())
    let delTooltip = `可删除倒计时：${util.timeFormat(delTimeout)}`
    this.setState({
      delTimeout,
      delTooltip,
      delInterval: setInterval(() => {
        delTimeout = delTimeout - 1000
        delTooltip = `可删除倒计时：${util.timeFormat(delTimeout)}`
        if (delTimeout <= 0) {
          clearInterval(this.state.delInterval as unknown as number)
        }
        this.setState({
          delTimeout,
          delTooltip
        })
      }, 1000)
    })
  }
  
  onCancelAddVersion () {
    this.props.history.goBack()
  }

  onAddGlobalConfig () {
    if ( this.state.currentVersion?.status !== VersionStatus.normal) return
    this.setState({
      showAddGlobalConfig: true
    })
  }


  //异步更新版本里的文档
  onUpdateVersion() {
    if (this.state.updateTimeout) {
      clearTimeout(this.state.updateTimeout);
    }
    this.setState({
      savePercent: _.random(10, 90, false),
      updateTimeout: setTimeout(() => {
        const {currentVersion} = this.state
        const param: UpdateTemplateVersion = {
          id: currentVersion!.id,
          readmeDoc: currentVersion!.readmeDoc,
          buildDoc: currentVersion!.buildDoc,
          updateDoc: currentVersion!.updateDoc,
        };
        this.props.dispatch({
          type: 'template/updateVersion',
          payload: param,
          callback: () => {
            this.setState({
              savePercent: 100,
            });
          }
        })
      }, 500) as unknown as number,
    })
  }



  //修改操作文档，同步更新状态
  onChangeReadme(content: string) {
    const currentVersion = util.clone(this.state.currentVersion)
    currentVersion!.readmeDoc = content
    this.setState({
      currentVersion
    })
    this.onUpdateVersion();
  }

  //操作部署文档，同步更新状态
  onChangeBuild(content: string) {
    const currentVersion = util.clone(this.state.currentVersion)
    currentVersion!.buildDoc = content
    this.setState({
      currentVersion
    })
    this.onUpdateVersion();
  }

  //修改更新文档，同步更新状态
  onChangeUpdate(content: string) {
    const currentVersion = util.clone(this.state.currentVersion)
    currentVersion!.updateDoc = content
    this.setState({
      currentVersion
    })
    this.onUpdateVersion();
  }

  onChangeVersion (templateVersion: TemplateVersion) {
    this.setState({
      currentVersion: templateVersion 
    })
    this.initDelInterval(templateVersion)
  }

  onDeleteVersion () {
    this.props.dispatch({
      type: 'template/deleteVersion',
      payload: this.state.currentVersion!.id,
      callback: () => {
        const versionList: TemplateVersion[] = []
        this.state.templateInfo?.versionList.forEach(version => {
          if (version.id !== this.state.currentVersion!.id) {
            versionList.push(version)
          }
        })
        const currentVersion = versionList.length > 0 ? versionList[0] : null
        const templateInfo = util.clone(this.state.templateInfo)
        templateInfo!.versionList = versionList
        this.setState({
          templateInfo,
          currentVersion
        })
        this.initDelInterval(currentVersion)
      }
    })
  }

  afterCreateVersion (version: TemplateVersion) {
    if (this.props.match.params.id == 'createTemplate') {
      this.props.history.replace(`/manage/template/${version.templateId}`)
    }else{
      const templateInfo = util.clone(this.state.templateInfo)
      templateInfo!.versionList.unshift(version)
      console.log(templateInfo)
      this.props.match.params.id = version.templateId
      this.setState({
        templateInfo,
        currentVersion: version
      })
      this.initDelInterval(version)
    } 
  }


  afterUpdateConfigStatus (data: {id: string; status: number}) {
    const currentVersion = util.clone(this.state.currentVersion)
    currentVersion?.gitList.forEach( (git) => {
      git.configList.forEach((item, index) => {
        if (item.id == data.id) {
          item.isHidden = data.status
        }
      })
    })
    const templateInfo = util.clone(this.state.templateInfo)
    templateInfo?.versionList.forEach((version, i) => {
      if (version.id === currentVersion!.id) {
        templateInfo.versionList[i] = currentVersion!
      }
    })
    this.setState({
      currentVersion,
      templateInfo
    })
  }
  

  afterUpdateConfig (config: TemplateConfig) {
    const currentVersion = util.clone(this.state.currentVersion)
    currentVersion?.gitList.forEach( (git) => {
      git.configList.forEach((item,index)=>{
        if (item.id == config.id) {
          git.configList[index] = config
        }
      })
    })
    const templateInfo = util.clone(this.state.templateInfo)
    templateInfo?.versionList.forEach((version, i) => {
      if (version.id === currentVersion!.id) {
        templateInfo.versionList[i] = currentVersion!
      }
    })
    this.setState({
      showAddGlobalConfig: false,
      currentVersion,
      templateInfo
    })
  }

  afterAddGit (git: TemplateVersionGit) {
    const currentVersion = util.clone(this.state.currentVersion)
    currentVersion?.gitList.push(git)
    
    const templateInfo = util.clone(this.state.templateInfo)
    templateInfo?.versionList.forEach((version, i) => {
      if (version.id === currentVersion!.id) {
        templateInfo.versionList[i] = currentVersion!
      }
    })
    this.setState({
      currentVersion,
      templateInfo,
      currentGitId: currentVersion!.gitList[currentVersion!.gitList.length - 1].id
    })
  }

  afterDelGit (gitId: string) {
    const currentVersion = util.clone(this.state.currentVersion)
    currentVersion?.gitList.forEach((git,index) => {
      if (gitId === git.id) {
        currentVersion.gitList.splice(index, 1)
      }
    })
    const templateInfo = util.clone(this.state.templateInfo)
    templateInfo!.versionList.forEach((version, i) => {
      if (version.id === currentVersion!.id) {
        templateInfo!.versionList[i] = currentVersion!
      }
    })
    this.setState({
      templateInfo,
      currentVersion,
      currentGitId: currentVersion!.gitList[currentVersion!.gitList.length - 1].id
    })
  }
  afterDelGlobalConfig (configId: string) {
    const currentVersion = util.clone(this.state.currentVersion)
    currentVersion?.globalConfigList.forEach((config, i) => {
      if (configId === config.id) {
        currentVersion.globalConfigList.splice(i, 1)
      }
    })
    const templateInfo = util.clone(this.state.templateInfo)
    templateInfo!.versionList.forEach((version, i) => {
      if (version.id === currentVersion!.id) {
        templateInfo!.versionList[i] = currentVersion!
      }
    })
    this.setState({
      templateInfo,
      currentVersion
    })
  }


  onCancelGlobalConfig () {
    this.setState({
      showAddGlobalConfig: false
    })
  }


  afterUpdateGlobalConfigStatus (data: {id: string; status: number}) {
    const currentVersion = util.clone(this.state.currentVersion)
    currentVersion?.globalConfigList.forEach( (item, index) => {
      if (item.id == data.id) {
        console.log(item.isHidden , data.status)
        item.isHidden = data.status
      }
    })
    const templateInfo = util.clone(this.state.templateInfo)
    templateInfo?.versionList.forEach((version, i) => {
      if (version.id === currentVersion!.id) {
        templateInfo.versionList[i] = currentVersion!
      }
    })
    this.setState({
      currentVersion,
      templateInfo
    })
  }
  afterUpdateGlobalConfig (config: TemplateGlobalConfig) {
    const currentVersion = util.clone(this.state.currentVersion)
    currentVersion?.globalConfigList.forEach( (item, index) => {
      if (item.id == config.id) {
        currentVersion.globalConfigList[index] = config
      }
    })
    const templateInfo = util.clone(this.state.templateInfo)
    templateInfo?.versionList.forEach((version, i) => {
      if (version.id === currentVersion!.id) {
        templateInfo.versionList[i] = currentVersion!
      }
    })
    this.setState({
      showAddGlobalConfig: false,
      currentVersion,
      templateInfo
    })
  }

  afterAddGlobalConfig (config: TemplateGlobalConfig) {
    const currentVersion = util.clone(this.state.currentVersion)
    currentVersion?.globalConfigList.push(config)
    const templateInfo = util.clone(this.state.templateInfo)
    templateInfo?.versionList.forEach((version, i) => {
      if (version.id === currentVersion!.id) {
        templateInfo.versionList[i] = currentVersion!
      }
    })
    this.setState({
      showAddGlobalConfig: false,
      currentVersion,
      templateInfo
    })
  }

  onPlaceOnFile () {
    if (!this.state.currentVersion) return
    this.props.dispatch({
      type: "template/updateTemplateVersionStatus",
      payload: {
        id: this.state.currentVersion.id,
        status: Number(VersionStatus.placeOnFile)
      },
      callback: () => {
        const currentVersion = util.clone( this.state.currentVersion )
        currentVersion!.status = Number(VersionStatus.placeOnFile)

        const templateInfo = util.clone(this.state.templateInfo)
        templateInfo?.versionList.map( (version, index) => {
          if (version.id == currentVersion!.id) {
            templateInfo.versionList[index] = currentVersion!
          }
        })
        this.setState({
          currentVersion,
          templateInfo
        })
        this.initDelInterval(currentVersion)
      }
    })
  }

  render() {
    const labelWidth = 75;
    if (!this.state.templateInfo && this.props.match.params.id != 'createTemplate') {
      return <Spin className={styles.gitEditLoading} tip="git详情获取中..." size="large"></Spin>;
    }
    return (
      <div className={styles.gitEditPanel}>
        {
          this.state.showAddGlobalConfig ? (
              <TemplateAddGlobalConfig
                templateId={this.props.match.params.id}
                versionId={this.state.currentVersion!.id}
                onClose={this.onCancelGlobalConfig}
                onSubmit={this.afterAddGlobalConfig}
              ></TemplateAddGlobalConfig>
          ): null
        }
        <div className={styles.gitPanelTop}>
          <a
            onClick={() => {
              this.props.history.goBack();
            }}>
            <LeftOutlined />
            返回
          </a>
          <span style={{marginLeft: '20px'}}>
            <Tooltip title="发布后版本将变为只读状态">
              {
                this.state.currentVersion?.status === VersionStatus.placeOnFile ? (
                   <a style={{marginLeft: '10px', color: '#faad14'}}>已发布</a>): (
                   <a style={{marginLeft: '10px', color: '#faad14'}} onClick={this.onPlaceOnFile} >发布 </a> )
              }
            </Tooltip>
            <Tooltip title="废弃后，新建项目中该版本将不可用">
              <a style={{marginLeft: '10px', color: '#f5222d'}}>废弃</a>
            </Tooltip>
            {
              this.state.delTimeout > 0 && this.state.currentVersion?.status === VersionStatus.normal ? (
                <span>
                  <a onClick={this.onDeleteVersion} style={{marginLeft: '10px', color: '#f5222d', marginRight: '5px'}}>删除</a>
                  ({this.state.delTooltip})
                </span>
              ) : null
            }
          
            {
              this.state.savePercent !== 100 && <Progress
                percent={this.state.savePercent}
                size="small"
                strokeWidth={2}
                format={(percent) => (percent === 100 ? 'saved' : 'saving')}
              ></Progress>
            }

          </span>
        </div>
      
        {
          this.state.templateInfo?.versionList.length ? (
            <div className={styles.gitPanelCenter}>
              <TimeLinePanel
                versionList={this.state.templateInfo.versionList}
                currentVersion={this.state.currentVersion!}
                afterAdd={this.afterCreateVersion}
                onChange={this.onChangeVersion}
              ></TimeLinePanel>
              <div className={styles.gitDetail}>
                <Description label="项目名称" labelWidth={labelWidth}>
                  {this.state.templateInfo.name}
                  <Tooltip title="版本" placement="bottom">
                    <Tag color="#87d068" style={{ marginLeft: '5px' }}>
                      v:{this.state.currentVersion?.version}
                    </Tag>
                  </Tooltip>
                  <Tooltip title="版本发布时间">
                    <Tag color="#f50">
                      {util.dateTimeFormat(new Date(this.state.templateInfo.createTime))}
                    </Tag>
                  </Tooltip>
                </Description>

                <Description
                  label="全局配置"
                  labelWidth={labelWidth}
                  display="flex"
                  className={styles.gitConfigs}>
                    
                    {/* 全局配置组件 */}
                    <TemplateGlobalConfigComponent
                      //全局配置项
                      mode={this.state.currentVersion!.status}
                      globalConfigList={this.state.currentVersion!.globalConfigList}
                      onSubmit={this.afterUpdateGlobalConfig}
                      afterUpdateGlobalConfigStatus={this.afterUpdateGlobalConfigStatus}
                      afterDelConfig={this.afterDelGlobalConfig}/>
                    {this.state.currentVersion?.status === VersionStatus.normal && <Button className={styles.btnAddConfigItem} onClick={this.onAddGlobalConfig}>添加配置项</Button>}

                </Description>

                <Description
                  label="配置项"
                  labelWidth={labelWidth}
                  display="flex"
                  className={styles.gitConfigs}>
                  
                  {/* 配置组件 */}
                  <TemplateConfigPanel
                    mode={this.state.currentVersion!.status}
                    activeKey={this.state.currentGitId}
                    onChangeGit={this.onChangeGit}
                    templateId={this.state.currentVersion!.templateId}
                    templateVersionId={this.state.currentVersion!.id}
                    globalConfigList={this.state.currentVersion!.globalConfigList} //全局配置项
                    gitList={this.state.currentVersion!.gitList} //版本git项
                    onSubmit={this.afterUpdateConfig}
                    afterAddGit={this.afterAddGit}
                    afterDelGit={this.afterDelGit}
                  ></TemplateConfigPanel>

                </Description>

                <Tabs defaultActiveKey="readme" style={{ margin: '10px 0 10px 85px' }}>
                  <Tabs.TabPane tab="使用文档" key="readme">
                    {
                      this.state.currentVersion && (
                        <Markdown
                          DisabledEdit={true}
                          content={this.state.currentVersion.readmeDoc}
                        ></Markdown>
                      )
                    }
                  </Tabs.TabPane>
                  <Tabs.TabPane tab="部署文档" key="build">
                    {
                      this.state.currentVersion && (
                        <Markdown
                          // onChange={this.onChangeBuild}
                          DisabledEdit={true}
                          content={this.state.currentVersion.buildDoc}
                        ></Markdown>
                      )
                    }
                  </Tabs.TabPane>
                  <Tabs.TabPane tab="更新内容" key="update">
                    {
                      this.state.currentVersion && (
                        <Markdown
                          // onChange={this.onChangeUpdate}
                          DisabledEdit={true}
                          content={this.state.currentVersion.updateDoc}
                        ></Markdown>
                      )
                    }
                  </Tabs.TabPane>
                </Tabs>
              </div>
            </div>
          ) : (
            <CreateTemplateVersion
              mode="init"
              title="创建初始版本"
              afterAdd={this.afterCreateVersion} 
              onCancel={this.onCancelAddVersion}/>
          )
        }
      </div>
    )
  }
}

export default connect(({ git }: ConnectState) => {
  return {
    gitList: git.gitList,
  };
})(withRouter(TemplateEdit));
