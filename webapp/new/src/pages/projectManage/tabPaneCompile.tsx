/*
 * @Descripttion: 
 * @version: 
 * @Author: Adxiong
 * @Date: 2021-08-25 14:54:49
 * @LastEditors: Adxiong
 * @LastEditTime: 2021-10-15 18:25:40
 */
import { ConnectState } from '@/models/connect'
import util from '@/utils/utils'
import { Button, Table } from 'antd'
import { ColumnProps } from 'antd/lib/table'
import { connect, Dispatch } from 'dva'
import React from 'react'
import { Member, ProjectCompile } from 'umi'
import DownloadService from "@/services/download"
import { blockStatement } from '@babel/types'

interface Props {
  id: string;
  memberList: Member[] | null;
  compileList: ProjectCompile[];
  dispatch: Dispatch;
}
interface States {
  tableLoading: boolean;
}

class TabPaneCompile extends React.Component<Props, States> {
  constructor(prop: Props){
    super(prop)
    this.state = {
      tableLoading: false
    }
  }

  async componentDidMount () {
    const id = this.props.id
    this.setState({
      tableLoading: true
    })
    await this.props.dispatch({
      type:"project/getMemberList"
    })
    await this.props.dispatch({
      type: "project/getCompileInfo",
      payload: id,
      callback: () => { 
        this.setState({
          tableLoading: false
        })
      }
    })
  }

  async onDownload(pathName: string) {
    const res = await DownloadService.getDownloadFilePath(pathName)as {status: number, data: string[]}
    if(res.data){
      for (const info of res.data) {
        console.log( info)
        const res = await DownloadService.downloadFile(info)
        // const blob = new Blob([res.data as string])
        // const href = window.URL.createObjectURL(blob)
        // var downloadElement = document.createElement('a');
        // downloadElement.href = href
        // downloadElement.click()
        // downloadElement.remove()
        
      }
    }
    
    
  }

  render() {

    const UserMap = {}

    this.props.memberList?.map( item => {
      UserMap[item.id] = item.name
    })

    const columns : ColumnProps<ProjectCompile>[] =[
      {
        title: '名称',
        dataIndex: 'projectName',
        ellipsis: true,
        width: 100,
        render(text: string, record: ProjectCompile) {
          return record.projectName
        }
      },
      {
        title: '描述',
        dataIndex: "description",
        ellipsis: true,
        render(text: string) {
          return (text || "-")
        }
      },
      {
        title: "使用客户",
        dataIndex: "cusName",
        ellipsis:true
      },
      {
        title: '编译状态',
        dataIndex: "compileResult",
        ellipsis: true,
        render(text: string){
          return (text || "-")
        }
      },
      {
        title: '编译时间',
        dataIndex: "compileTime",
        defaultSortOrder: "descend",
        sortDirections: ['ascend', 'descend'],
        sorter: (a, b) => new Date(a.compileTime).getTime() - new Date(b.compileTime).getTime() ,
        render(text: Date){
          return (util.dateTimeFormat(new Date(text)) || "-")
        }
      },
      {
        title: "编译者",
        dataIndex: "compileUser",
        render(text: string){
          return ( UserMap[text] || "-")
        }
      },{
        title: "下载",
        dataIndex:"file",
        render: (text: string, record: ProjectCompile)=>{
          return(
            <>
              <Button 
                onClick={this.onDownload.bind(this,record.file)}
              >下载文件</Button>
          </>
          )
        }
      }
    ]
    return (
      <div>
        <Table
          columns={columns}
          dataSource={this.props.compileList}
          rowKey="id"
          loading={this.state.tableLoading}
          pagination={{pageSize: 12, showTotal(totle: number) {
            return (
              `总记录数${totle}`
            )
          }}}
        >
        </Table>
      </div>
    )
  }
}


export default connect( ({compile, project}:ConnectState) => {
  return {
    memberList: project.memberList,
    compileList: project.compileInfo || []
  }
})(TabPaneCompile)