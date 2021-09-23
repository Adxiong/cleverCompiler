/*
 * @Descripttion: 
 * @version: 
 * @Author: Adxiong
 * @Date: 2021-08-23 16:56:36
 * @LastEditors: Adxiong
 * @LastEditTime: 2021-09-02 19:09:02
 */
import {Router, Response, Request, NextFunction} from 'express'
import { ApiResult, ResponseStatus } from '../types/apiResult'
import { CompileParam, ProjectCompile } from '../types/compile'
import CompileService from '../service/compile'
const router = Router()

//编译添加
router.post('/add', (req: Request, res: Response, next: NextFunction) => {
  const compile = req.body as CompileParam
  CompileService.addCompile(compile)
  .then( (compile: ProjectCompile) => {
    res.json(new ApiResult(ResponseStatus.success, compile))
  })
  .catch(next)
})



export default router