/*
 * @Descripttion: 
 * @version: 
 * @Author: Adxiong
 * @Date: 2021-08-12 08:30:26
 * @LastEditors: Adxiong
 * @LastEditTime: 2021-08-12 11:01:41
 */
import * as React from 'react';
import { Modal, Card, Row, Col } from 'antd';
import TemplateTextConfig from './templateTextConfig'
import styles from '../gitManage/styles/gitAddConfig.less'
import { ConfigType } from '@/models/common';
import { connect } from 'dva'
import { TemplateConfig } from '@/models/template';
import { Dispatch } from '@/.umi/plugin-dva/connect';
import { ConnectState } from '@/models/connect';

interface Props {
  templateId: string;
  versionId: string;
  gitId: string;
  mode: string;
  configTypes: ConfigType[];
  dispatch: Dispatch;
  onClose ?(): void;
  onSubmit ?(config: TemplateConfig): void;
}
interface State {
  type?: ConfigType;
}
class AddTemplateConfig extends React.Component<Props, State> {
  static defaultProps = {
    mode: 'add'
  }

  constructor (props: Props) {
    super(props)
    this.state = {}
    this.onSubmitForm = this.onSubmitForm.bind(this)
    this.onBack = this.onBack.bind(this)
    this.onCancel = this.onCancel.bind(this)
  }

  componentDidMount () {
    this.queryConfigTypes()
  }

  queryConfigTypes () {
    this.props.dispatch({
      type: 'sys/queryConfigTypes'
    })
  }

  onClickType (configType: ConfigType) {
    this.setState({
      type: configType
    })
  }

  onSubmitForm (formData: any) {
    this.props.dispatch({
      type: 'template/addConfig',
      payload: {
        templateId: this.props.templateId,
        templateVersionId: this.props.versionId,
        typeId: this.state.type!.id,
        ...formData
      },
      callback: (config: TemplateConfig) => {
        if (this.props.onSubmit) this.props.onSubmit(config)
      }
    })
  }

  onCancel () {
    if (this.props.onClose) this.props.onClose()
  }

  onBack () {
    this.setState({
      type: undefined
    })
  }

  render () {
    let title = this.props.mode === 'add' ? '添加配置' : '修改配置'
    if (this.state.type) {
      switch (this.state.type.key) {
        case 'text':
          return (
            <TemplateTextConfig 
              gitId={this.props.gitId}
              versionId={this.props.versionId}
              onSubmit={this.onSubmitForm}
              onBack={this.onBack}
              onCancel={this.onCancel}></TemplateTextConfig>
          )
        case 'file':
          return (
            // <GitFileConfig></GitFileConfig>
            'git file config'
          )
        case 'json':
          return (
            // <GitJsonConfig></GitJsonConfig>
            'git json config'
          )
        default:
          return (
            <div>未知配置类型</div>
          )
      }
    } else {
      return (
        <Modal 
          title={title} 
          visible={true} 
          className={styles.addGitConfigModal}
          footer={null}
          onCancel={this.onCancel}>
          <Row gutter={16}>
            {this.props.configTypes.map(config => {
              return (
                <Col span={8} key={config.id}>
                  <Card className={styles.configItem} onClick={this.onClickType.bind(this, config)}>{config.label}</Card>
                </Col>
              )
            })}
          </Row>
        </Modal>
      )
    }
  }
}

export default connect(({sys}: ConnectState) => {
  return {
    configTypes: sys.configTypes
  }
})(AddTemplateConfig)