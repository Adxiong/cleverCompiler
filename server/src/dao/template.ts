import { UpdateTemplateGlobalConfig } from './../types/template';
/*
 * @Descripttion:
 * @version:
 * @Author: Adxiong
 * @Date: 2021-08-07 09:59:03
 * @LastEditors: Adxiong
 * @LastEditTime: 2021-11-08 00:23:37
 */
/**
 * 模板
 */

import {
  CreateTemplateConfig,
  CreateTemplateGlobalConfigParams,
  CreateTemplateVersionGitParams,
  CreateTemplateVersionParams,
  TemplateConfig,
  TemplateGlobalConfig,
  TemplateInfo,
  TemplateInstance,
  TemplateVersion,
  TemplateVersionGit,
  UpdateConfigParam,
  UpdateTemplateStatus
} from '../types/template'
import * as _ from 'lodash'
import pool from './pool'
import util from '../utils/util'
import logger from '../utils/logger'
import { GitConfig } from '../types/git'

interface GitVersionDoc {
  name: string;
  readmeDoc: string;
  buildDoc: string;
  updateDoc: string;
}

class TemplateDao {
  async query(): Promise<TemplateInstance[]> {
    const sql = `SELECT
      a.id as id,
      a.\`name\` as name,
      a.description as description,
      a.creator_id as creator_id,
      a.create_time as create_time,
      a.\`enable\` as enable,
      b.id as version_id,
      b.version as version 
    FROM
      template AS a
    LEFT JOIN ( 
      SELECT 
        id,
        template_id, 
        max( version ) AS version
      FROM template_version 
      GROUP BY template_id ) AS b 
    ON a.id = b.template_id`
    return await pool.query<TemplateInstance>(sql)
  }

  async updateTemplate(template: TemplateInstance): Promise<void> {
    const props = []
    const params = []
    for (const key in template) {
      if (key !== 'id' && key !== 'create_time') {
        props.push(`${_.snakeCase(key)}=?`)
        params.push(template[key])
      }
    }
    params.push(template.id)
    const sql = `update template set ${props.join(',')} where id=?`
    await pool.query(sql, params)
  }

  async getById(id: string): Promise<TemplateInstance> {
    const sql = 'select * from template where id = ?'
    const list = await pool.query<TemplateInstance>(sql, [id])
    return list.length ? list[0] : null
  }

  async getInfo(id: string): Promise<TemplateInfo> {
    const infoSql = 'select tp.* from template as tp where tp.id = ?'
    const infoList = (await pool.query<TemplateInfo>(infoSql, [
      id
    ])) as TemplateInfo[]
    const templateInfo = infoList.length ? infoList[0] : null

    templateInfo.versionList = await this.getVersionbyTemplateId(templateInfo.id) 
    return templateInfo
  }

  async createVersion( param: CreateTemplateVersionParams, creatorId: string): Promise<TemplateVersion> {
    let templateId = param.templateId

    if (templateId == "" ) {
      const connect = await pool.beginTransaction()
      try {
        const sql =  `insert into 
        template(
          id, 
          name,
          description,
          creator_id,
          create_time
        ) values(
          ?,?,?,?,?
        )`
        templateId = util.uuid()
        await pool.writeInTransaction(connect, sql, [
          templateId,
          param.name,
          param.description,
          creatorId,
          new Date()
        ])
        await pool.commit(connect)
      }
      catch (e) {
        pool.rollback(connect)
        logger.error("向template表插入数据失败",e)
        throw e
      }
    }
    
    const TemplateInfo = await this.getInfo(templateId)
    const lastVersionInfo = TemplateInfo.versionList[TemplateInfo.versionList.length - 1 ]
    
    const sql = `insert into 
       template_version(
         id, 
         template_id,
         description,
         version,
         publish_time,
         build_doc,
         readme_doc,
         update_doc
       ) values(
         ?,?,?,?,?,?,?,?
       )`
    const versionId = util.uuid()
    await pool.write(sql, [
      versionId,
      templateId,
      param.versionDescription,
      param.version,
      new Date(),
      lastVersionInfo ? lastVersionInfo.buildDoc : '',
      lastVersionInfo ? lastVersionInfo.readmeDoc : '',
      lastVersionInfo ? lastVersionInfo.updateDoc : ''
    ])

    const globalConfigMap = {}

    if (lastVersionInfo) {
      await Promise.all( lastVersionInfo.globalConfigList.map( async config => {
        const configRes = await this.addGlobalConfig({
          name: config.name,
          templateId: templateId,
          templateVersionId: versionId,
          description: config.description,
          targetValue: config.targetValue,
          type: config.type,
          isHidden: config.isHidden,

        })
        globalConfigMap[config.id] = configRes.id
      }))

      await Promise.all( lastVersionInfo.gitList.map( async git => {
        await this.copyTemplateVersionGit(git, globalConfigMap)
      }))
    }

    return this.getVersionbyId(versionId)
  }

  async copyTemplateVersionGit(git: TemplateVersionGit,globalConfigMap): Promise<void> {
    const sql = `insert into 
    template_version_git(
      id,
      template_id,
      template_version_id,
      git_source_id,
      git_source_version_id
    )values(
      ?,?,?,?,?
    )`
    const gitId = util.uuid()
    await pool.write(sql, [
      gitId,
      git.templateId,
      git.templateVersionId,
      git.gitSourceId,
      git.gitSourceVersionId
    ])

    git.configList.map( async config => {
      await this.copyTemplateVersionConfig(config, globalConfigMap[config.globalConfigId])
    })
  }

  async copyTemplateVersionConfig (config: CreateTemplateConfig, globalConfigId: string): Promise<TemplateConfig> {
    const sql = `insert into 
     template_config(
       id, 
       template_id,
       template_version_id,
       template_version_git_id,
       git_source_config_id,
       target_value,
       is_hidden,
       global_config_id
     ) values(
       ?,?,?,?,?,?,?,?
     )`
    const configId = util.uuid()
    await pool.write(sql, [
      configId,
      config.templateId,
      config.templateVersionId,
      config.templateVersionGitId,
      config.gitSourceConfigId,
      config.targetValue,
      config.isHidden,
      globalConfigId != "" ? globalConfigId : null
    ])
    return await this.getConfigById(configId)
  }

  async getVersionbyId(id: string): Promise<TemplateVersion> {
    const sql = 'select template_version.* from template_version where id = ?'
    const list = await pool.query<TemplateVersion>(sql, [id])
    if( list.length ){
      list[0].gitList = await this.getGitByTemplateVersionId(id)
      list[0].globalConfigList = await this.getGlobalConfigByTemplateVersionId(id)
    }
    return list.length ? list[0] : null
  }

  async getVersionbyTemplateId(templateid: string): Promise<TemplateVersion[]> {
    const sql =
      'select version.* from template_version as version where version.template_id = ? order by version.publish_time desc'
    const versionList =  await pool.query<TemplateVersion>(sql, [templateid])
    await Promise.all(
      versionList.map(async item => {
        item.gitList = await this.getGitByTemplateVersionId(item.id)
        item.globalConfigList = await this.getGlobalConfigByTemplateVersionId(
          item.id
        )
      })
    )
    return versionList
  }

  async updateVersion(template: TemplateVersion): Promise<void> {
    const props = []
    const params = []
    for (const key in template) {
      if (key !== 'id') {
        props.push(`${_.snakeCase(key)}=?`)
        params.push(template[key])
      }
    }
    params.push(template.id)
    const sql = `update template_version set ${props.join(',')} where id=?`
    await pool.query(sql, params)
  }

  async delVersionById(id: string): Promise<void> {
    const sql = `delete from template_version where id=?`
    await pool.query(sql, [id])
  }

  async getGitDocByGitVersionID(id: string): Promise<GitVersionDoc> {
    const sql = `SELECT
       readme_doc,
       build_doc,
       update_doc,
     NAME 
     FROM
       source_version
       LEFT JOIN git_source ON source_version.source_id = git_source.id 
     WHERE
       source_version.id = ?`
    const list = await pool.query<GitVersionDoc>(sql, [id])
    if (list.length > 0) {
      list[0].buildDoc = list[0].buildDoc == null ? '' : list[0].buildDoc
      list[0].readmeDoc = list[0].readmeDoc == null ? '' : list[0].readmeDoc
      list[0].updateDoc = list[0].updateDoc == null ? '' : list[0].updateDoc
      return list[0]
    }
    return null
  }
  async getVersionDocByID(id: string): Promise<TemplateVersion> {
    const sql = `SELECT
       readme_doc,
       build_doc,
       update_doc 
     FROM
       template_version 
     WHERE
       id = ?`
    const list = await pool.query<TemplateVersion>(sql, [id])
    if (list.length > 0) {
      list[0].buildDoc = list[0].buildDoc == null ? '' : list[0].buildDoc
      list[0].readmeDoc = list[0].readmeDoc == null ? '' : list[0].readmeDoc
      list[0].updateDoc = list[0].updateDoc == null ? '' : list[0].updateDoc
      return list[0]
    }
  }


  //添加template——version-git
  async createTemplateVersionGit(
    params: CreateTemplateVersionGitParams
  ): Promise<TemplateVersionGit> {
    const sql = `insert into 
     template_version_git(
       id,
       template_id,
       template_version_id,
       git_source_id,
       git_source_version_id
     )values(
       ?,?,?,?,?
     )`
    const id = util.uuid()
    await pool.write(sql, [
      id,
      params.templateId,
      params.templateVersionId,
      params.gitSourceId,
      params.gitSourceVersionId
    ])
    const gitVersionDoc = await this.getGitDocByGitVersionID(params.gitSourceVersionId)
    const versionDoc = await this.getVersionDocByID(params.templateVersionId)
    const Merge = {
      buildDpc: `${versionDoc.buildDoc}\n# ${gitVersionDoc.name}\n${gitVersionDoc.buildDoc}`,
      readmeDoc: `${versionDoc.readmeDoc}\n# ${gitVersionDoc.name}\n${gitVersionDoc.readmeDoc}`,
      updateDoc: `${versionDoc.updateDoc}\n# ${gitVersionDoc.name}\n${gitVersionDoc.updateDoc}`
    }
    await this.updateVersion({
      id: params.templateVersionId,
      buildDoc: Merge.buildDpc,
      readmeDoc: Merge.readmeDoc,
      updateDoc: Merge.updateDoc
    } as TemplateVersion)

    const configList = await this.getGitSourceConfigByVersionId(
      params.gitSourceVersionId
    )
    await Promise.all(
      configList.map(async item => {
        await this.copyTemplateVersionConfig({
          templateId: params.templateId,
          templateVersionId: params.templateVersionId,
          templateVersionGitId: id,
          gitSourceConfigId: item.id,
          targetValue: item.targetValue,
          isHidden: 0
        }, "")
      })
    )
    const GitData = await this.getGitById(id)
    return GitData
  }

  async getGitSourceConfigByVersionId(id: string): Promise<GitConfig[]> {
    const sql = `select sc.* from source_config as sc where version_id = ?`
    return await pool.query<GitConfig>(sql, [id])
  }

  async delTemplateVersionGit(id: string): Promise<TemplateVersion> {
    await this.delTemplateVersionConfigByVGID(id)
    //查询出template_version_id,git_source_version_id
    const data = await this.getGitById(id)
    const versionDoc = await this.getVersionDocByID(data.templateVersionId)
    const sourceVersionDoc = await this.getGitDocByGitVersionID(
      data.gitSourceVersionId
    )
    if (versionDoc && sourceVersionDoc) {
      versionDoc.readmeDoc = versionDoc.readmeDoc.replace(
        `\n# ${sourceVersionDoc.name}\n${sourceVersionDoc.readmeDoc}`,
        ''
      )

      versionDoc.updateDoc = versionDoc.updateDoc.replace(
        `\n# ${sourceVersionDoc.name}\n${sourceVersionDoc.updateDoc}`,
        ''
      )

      versionDoc.buildDoc = versionDoc.buildDoc.replace(
        `\n# ${sourceVersionDoc.name}\n${sourceVersionDoc.buildDoc}`,
        ''
      )
    }

    const updateParam = {
      id: data.templateVersionId,
      readmeDoc: versionDoc.readmeDoc,
      updateDoc: versionDoc.updateDoc,
      buildDoc: versionDoc.buildDoc
    } as TemplateVersion
    await this.updateVersion(updateParam)

    const sql = `delete from template_version_git where id = ?`
    await pool.query(sql, [id])

    return updateParam
  }

  async getGitById(tvId: string): Promise<TemplateVersionGit> {
    const sql = `select vg.* ,name from template_version_git as vg left join git_source ON vg.git_source_id = git_source.id where vg.id = ?`
    const list = await pool.query<TemplateVersionGit>(sql, [tvId])
    if (list.length) {
      await Promise.all(
        list.map(async item => {
          item.configList = await this.getGitSourceConfigAndConfigByVersionId(item.id)
        })
      )
    }
    return list.length > 0 ? list[0] : null
  }

  async getGitByTemplateVersionId(tvId: string): Promise<TemplateVersionGit[]> {
    const sql = `select vg.* ,name from template_version_git as vg left join git_source ON vg.git_source_id = git_source.id where vg.template_version_id = ?`
    const data = await pool.query<TemplateVersionGit>(sql, [tvId])
    if (data.length) {
      await Promise.all(
        data.map(async item => {
          item.configList = await this.getGitSourceConfigAndConfigByVersionId(
            item.id
          )
        })
      )
    }
    return data.length > 0 ? data : []
  }

  

  async getGitSourceConfigAndConfigByVersionId(
    versionGitId: string
  ): Promise<TemplateConfig[]> {
    const sql = `select 
       tc.id as id,
       tc.target_value as target_value,
       tc.is_hidden as is_hidden,
       tc.global_config_id ,
       sc.type_id as type_id,
       sc.description as description,
       sc.reg as reg,
       sc.file_path as file_path,
       sc.target_value as source_value
       from template_config as tc
       left JOIN source_config as sc
       on
         sc.id = tc.git_source_config_id
       where tc.template_version_git_id = ?`
    return await pool.query<TemplateConfig>(sql, [versionGitId])
    
  }

  // async getConfigsByVersionGitId(id: string): Promise<TemplateConfig[]> {
  //   const sql = 'select * from template_config where git_source_config_id =?'
  //   const list = await pool.query<TemplateConfig>(sql, [id])
  //   return list
  // }

  async getConfigById(id: string): Promise<TemplateConfig> {
    const sql =  `select 
      tc.id as id,
      tc.target_value as target_value,
      tc.is_hidden as is_hidden,
      tc.global_config_id ,
      sc.type_id as type_id,
      sc.description as description,
      sc.reg as reg,
      sc.file_path as file_path,
      sc.target_value as source_value
      from template_config as tc
      left JOIN source_config as sc
      on
        sc.id = tc.git_source_config_id
      where tc.id = ?`
    const list = await pool.query<TemplateConfig>(sql, [id])
    return list.length > 0 ? list[0] : null
  }

  async updateConfig(config: UpdateConfigParam): Promise<TemplateConfig> {
    const props = []
    const params = []
    for (const key in config) {
      if (key !== 'id') {
        props.push(`${_.snakeCase(key)}=?`)
        params.push(config[key])
      }
    }
    params.push(config.id)
    const sql = `update template_config set ${props.join(',')} where id=?`
    await pool.query(sql, params)
    return await this.getConfigById(config.id)
  }

  async delTemplateVersionConfigByVGID(id: string): Promise<void> {
    const sql = `delete from template_config where template_version_git_id = ?`
    await pool.query(sql, [id])
  }

  async deleteConfigById(configId: string): Promise<void> {
    const sql = `delete from template_config where id=?`
    await pool.query(sql, [configId])
  }

  async addGlobalConfig(
    config: CreateTemplateGlobalConfigParams
  ): Promise<TemplateGlobalConfig> {
    const sql = `insert into 
     template_global_config(
       id ,
       name,
       description,
       template_id ,
       template_version_id, 
       target_value,
       type
      ) 
      values(?,?,?,?,?,?,?)`
    const comConfigId = util.uuid()
    await pool.write(sql, [
      comConfigId,
      config.name,
      config.description,
      config.templateId,
      config.templateVersionId,
      config.targetValue,
      config.type
    ])
    return await this.getGlobalConfigById(comConfigId)
  }

  async getGlobalConfigById(id: string): Promise<TemplateGlobalConfig> {
    const sql = `select * from template_global_config where id = ?`
    const list = await pool.query<TemplateGlobalConfig>(sql, [id])
    return list.length > 0 ? list[0] : null
  }

  async getGlobalConfigByTemplateVersionId(
    id: string
  ): Promise<TemplateGlobalConfig[]> {
    const sql = `select * from template_global_config where template_version_id = ?`
    const data = await pool.query<TemplateGlobalConfig>(sql, [id])
    return data.length > 0 ? data : []
  }

  async updateGlobalConfig(config: UpdateTemplateGlobalConfig): Promise<TemplateGlobalConfig> {
    const props = []
    const params = []
    for (const key in config) {
      if (key !== 'id') {
        props.push(`${_.snakeCase(key)}=?`)
        params.push(config[key])
      }
    }
    params.push(config.id)
    const sql = `update template_global_config set ${props.join(
      ','
    )} where id=?`
    await pool.query(sql, params)
    return await this.getGlobalConfigById(config.id)
  }

  async updateGlobalConfigStatus(config: {id: string; status: number}): Promise<void> {
    const sql = `update template_global_config set is_hidden = ? where id = ?`
    await pool.query(sql, [
      config.status,
      config.id
    ])
  }

  async deleteGlobalConfigById(configId: string): Promise<void> {
    const sql = `delete from template_global_config where id=?`
    await pool.query(sql, [configId])
  }

  async deleteTemplateById (id: string): Promise<void>{
    const delTemplate = 'delete from template where id = ?'
    const delTempletVersion = 'delete from template_version where template_id = ?'
    const delTemplateVersionGit = 'delete from template_version_git where template_id = ?'
    const delTemplateConfig = 'delete from template_config where template_id = ?'
    const delTemplateGlobalConfig = `delete from template_global_config where template_id = ?`
    const conn = await pool.beginTransaction()
    try {
      await pool.writeInTransaction(conn, delTemplateConfig, [id])
      await pool.writeInTransaction(conn, delTemplateVersionGit, [id])
      await pool.writeInTransaction(conn, delTemplateGlobalConfig, [id])
      await pool.writeInTransaction(conn, delTempletVersion, [id])
      await pool.writeInTransaction(conn, delTemplate, [id])
      await pool.commit(conn)
    } catch (e) {
      pool.rollback(conn)
      throw e
    }
  }

  async updateTemplateStatus (List: UpdateTemplateStatus[]): Promise<void> {
    const sql = 'update template set enable = ? where id = ?'
    const connect = await pool.beginTransaction()
    try {
      await Promise.all( List.map( async git => {
        await pool.writeInTransaction(connect, sql, [git.enable, git.id])
      }))
      await pool.commit(connect)
    }
    catch (e) {
      await pool.rollback(connect)
      logger.error('向git表插入数据失败', e)
      throw (e)
    }
  }
}
const templateDao = new TemplateDao()
export default templateDao
