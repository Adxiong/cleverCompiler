import { ConnectState } from '@/models/connect'
import { GitInstance } from '@/models/git'
import { Button, Form, Input, Table } from 'antd'
import { ColumnProps } from 'antd/lib/table'
import { connect } from 'dva'
import React from 'react'
import { withRouter } from 'react-router'
import { Dispatch, IRouteComponentProps } from 'umi'
import styles from './styles/gitList.less'
export interface GitListProps extends IRouteComponentProps{
  gitList: GitInstance[];
  dispatch: Dispatch;
}

interface State {
  form: {
    name: string,
    version: string
  };
  searchVaild: boolean;
  selectedRowKeys: string[]
}
class GitList extends React.Component<GitListProps, State> {
  constructor (props: GitListProps) {
    super(props)
    this.state = {
      form: {
        name: '',
        version: ''
      },
      searchVaild: true,
      selectedRowKeys: []
    }
    this.onClickEdit = this.onClickEdit.bind(this)
    this.onSearch = this.onSearch.bind(this)
    this.onCreateGit = this.onCreateGit.bind(this)
    this.rowSelectChange = this.rowSelectChange.bind(this)
  }

  componentDidMount () {
    this.props.dispatch({
      type: 'git/query'
    })
  }

  onClickEdit (git: GitInstance) {
    this.props.history.push(`/manage/git/${git.id}`)
  }
  onCreateGit () {
    this.props.history.push(`/manage/git/createGit`)
  }
  onSearch (changedValues: any, values: any) {
    // 防抖处理 300ms
    if ( !this.state.searchVaild ) {
      return 
    } 
    this.setState({
      searchVaild: false
    })
    setTimeout(() => {
      this.setState({
        searchVaild: true,
        form: {
          ...this.state.form,
          ...values
        }
      })
    }, 300)
  }
  rowSelectChange (selectedRowKeys: React.Key[], selectedRows: GitInstance[]) {
    // console.log(selectedRowKeys)
    var arr = selectedRowKeys.map(item => String(item))
    this.setState({
      selectedRowKeys: arr
    })
  }

  render () {
    const columns: ColumnProps<GitInstance>[] = [
      {
        title: '项目名称',
        dataIndex: 'name',
        fixed: 'left',
        width: 300,
        render (text, record: GitInstance) {
          return (
            <div>
              <div>{text}</div>
              <div>{record.description}</div>
            </div>
          )
        }
      },
      {
        title: '最新版本',
        dataIndex: 'version',
        render (text) {
          return (
            text || '-'
          )
        }
      },
      {
        title: '使用文档',
        dataIndex: 'readmeDoc',
        render (text) {
          return (
            <a>{text || '-'}</a>
          )
        }
      },
      {
        title: '部署文档',
        dataIndex: 'buildDoc',
        render (text) {
          return (
            <a>{text || '-'}</a>
          )
        }
      },
      {
        title: '更新文档',
        dataIndex: 'updateDoc',
        render (text) {
          return (
            <a>{text || '-'}</a>
          )
        }
      },
      {
        title: '操作',
        dataIndex: 'handle',
        fixed: 'right',
        render: (text, record: GitInstance) => {
          return (
            <div className={styles.toHandle}>
              <a onClick={this.onClickEdit.bind(this, record)}>编辑</a>
              <a style={{marginRight: 5}}>版本记录</a>
              <a>禁用</a>
            </div>
          )
        }
      }
    ]
    const formData = this.state.form
    const showList = this.props.gitList.filter(item => {
      return new RegExp(formData.name, 'i').test(item.name) && new RegExp(formData.version, 'i').test(item.version)
    })
    return (
      <div className={styles.gitSourceList}>
        <div className={styles.gitFilterPanel}>
          <Form layout="inline" onValuesChange={this.onSearch}>
            <Form.Item label="项目名称" name="name">
              <Input/>
            </Form.Item>
            <Form.Item label="版本" name="version">
              <Input/>
            </Form.Item>
            <Form.Item>
              <Button type="primary">批量启用</Button>
            </Form.Item>
            <Form.Item>
              <Button danger>批量禁用</Button>
            </Form.Item>
            <Form.Item>
              <Button onClick={this.onCreateGit}>创建项目</Button>
            </Form.Item>
          </Form>
        </div>
        <Table
          rowSelection={{
            type: "checkbox",
            onChange: this.rowSelectChange
          }}
          rowKey="id"
          columns={columns} 
          dataSource={showList}
          pagination={{pageSize: 5, showTotal(totle: number) {
            return (
              `总记录数${totle}`
            )
          }}}
        ></Table>
      </div>
    )
  }
}

export default connect(({git}: ConnectState) => {
  return {
    gitList: git.gitList
  }
})(withRouter(GitList))