import * as React from 'react'
import { Modal, Form, Input, Radio, message, Select } from 'antd'
import { Version } from '@/models/common';
import { GitBranch, GitCommit, GitCreateVersionParam, GitTag, GitVersion } from '@/models/git';
import util from '@/utils/utils';
import { connect } from 'dva';
import { Dispatch } from '@/.umi/plugin-dva/connect';

interface FormData {
  source: string;
  version: string;
  branch: string;
  tag: string;
  commit: string;
  description: string;
  parentId: string;
}
interface Props {
  gitId: string;
  repoId: string;
  title?: string;
  versionList: Version[];
  dispatch: Dispatch;
  onCancel? (): void;
  afterAdd? (version: Version): void;
}
interface States {
  show: boolean;
  form: FormData;
  branchList: GitBranch[];
  tags: GitTag[];
  commits: GitCommit[];
  ready: {
    branch: boolean;
    tag: boolean;
    commit: boolean;
  };
}

class CreateGitVersion extends React.Component<Props, States> {
  constructor (props: Props) {
    super(props)
    this.state = {
      show: true,
      form: {
        version: '',
        description: '',
        source: 'branch',
        branch: '',
        tag: '',
        commit: '',
        parentId: ''
      },
      branchList: [],
      tags: [],
      commits: [],
      ready: {
        branch: false,
        tag: false,
        commit: false
      }
    }
    this.onCommit = this.onCommit.bind(this)
    this.onCancel = this.onCancel.bind(this)
    this.onChangeForm = this.onChangeForm.bind(this)
  }
  componentDidMount () {
    this.getBranchList()
    this.getTags()
    this.getCommits()
  }

  getBranchList () {
    this.props.dispatch({
      type: 'git/queryBranchs',
      payload: this.props.repoId,
      callback: (list: GitBranch[]) => {
        this.setState({
          branchList: list
        })
      }
    })
  }

  getTags () {
    this.props.dispatch({
      type: 'git/queryTags',
      payload: this.props.repoId,
      callback: (list: GitTag[]) => {
        this.setState({
          tags: list
        })
      }
    })
  }
  getCommits () {
    this.props.dispatch({
      type: 'git/queryCommits',
      payload: this.props.repoId,
      callback: (list: GitCommit[]) => {
        this.setState({
          commits: list
        })
      }
    })
  }
  onFilterCommit<GitCommit> (value: string, optionData: any): boolean {
    return new RegExp(value.toLowerCase()).test(optionData.title.toLowerCase())
  }
  onChangeForm (chanedValue: any, values: FormData) {
    this.setState({
      form: values
    })
  }
  onCommit () {
    const source = this.state.form.source as 'branch' | 'tag' | 'commit'
    const data: GitCreateVersionParam = {
      gitId: this.props.gitId,
      version: this.state.form.version,
      source: source,
      value: this.state.form[source],
      description: this.state.form.description,
      parentId: this.state.form.parentId
    }
    this.props.dispatch({
      type: 'git/createVersion',
      payload: data,
      callback: (version: GitVersion) => {
        if (this.props.afterAdd) this.props.afterAdd(version)
      }
    })
  }
  onCancel () {
    this.setState({
      show: false
    })
    if (this.props.onCancel) this.props.onCancel()
  }
  render () {
    const source = this.state.form.source
    const branchDisplay = source === 'branch' ? 'flex' : 'none'
    const tagDisplay = source === 'tag' ? 'flex' : 'none'
    const commitDisplay = source === 'commit' ? 'flex' : 'none'
    return (
      <Modal
        className="create-git-version"
        title={this.props.title || '添加版本'}
        closable={false}
        visible={this.state.show}
        cancelText="取消"
        okText="保存"
        onCancel={this.onCancel}
        onOk={this.onCommit}>
        <Form 
          labelCol={{ span: 4 }}
          wrapperCol={{ span: 14 }} 
          initialValues={this.state.form}
          layout="horizontal"
          onValuesChange={this.onChangeForm}>
          <Form.Item label="版本号" name="version">
            <Input addonBefore="v" placeholder="x.x.x"/>
          </Form.Item>
          <Form.Item label="描述" name="description">
            <Input></Input>
          </Form.Item>
          <Form.Item label="来源" name="source">
            <Radio.Group>
              <Radio.Button value="branch">branch</Radio.Button>
              <Radio.Button value="tag">tag</Radio.Button>
              <Radio.Button value="commit">commit</Radio.Button>
            </Radio.Group>
          </Form.Item>
          <Form.Item label="branch" name="branch" style={{display: branchDisplay}}>
            <Select showSearch={true}>
              {
                this.state.branchList.map(branch => {
                  return (
                    <Select.Option value={branch.name} key={branch.name} title={branch.name}>
                      {branch.name}
                    </Select.Option>
                  )
                })
              }
            </Select>
          </Form.Item>
          <Form.Item label="tag" name="tag" style={{display: tagDisplay}}>
            <Select showSearch={true}>
            {
              this.state.tags.map(tag => {
                return (
                  <Select.Option value={tag.name} key={tag.name} title={tag.name}>
                    {tag.name}
                  </Select.Option>
                )
              })
            }
            </Select>
          </Form.Item>
          <Form.Item label="commit" name="commit" style={{display: commitDisplay}}>
            <Select showSearch={true} filterOption={this.onFilterCommit}>
            {
              this.state.commits.map(commit => {
                return (
                  <Select.Option value={commit.id} key={commit.id} title={commit.message}>
                    {commit.message}
                    {commit.createdAt ? (
                      <div className="git-commit-time">{util.dateTimeFormat(new Date(commit.createdAt))}</div>
                    ) : null}
                  </Select.Option>
                )
              })
            }
            </Select>
          </Form.Item>
          <Form.Item label="父版本" name="parentId">
            <Select>
              {this.props.versionList.map(version => {
                return (
                <Select.Option 
                  value={version.id} 
                  key={version.id} 
                  title={version.name}>
                  {version.name}
                  <div className='option-desc'>{version.description}</div>
                </Select.Option>
                )
              })}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    )
  }
}
export default connect()(CreateGitVersion)