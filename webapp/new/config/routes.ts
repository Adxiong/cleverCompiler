﻿export default [
  {
    path: '/user',
    component: '../layouts/UserLayout',
    routes: [
      {
        name: 'login',
        path: '/user/login',
        component: './User/login',
      }
    ],
  },
  {
    path: '/init',
    component: './initGuide/guide'
  },
  {
    path: '/',
    component: '../layouts/SecurityLayout',
    authority: ['admin', 'user'],
    routes: [
      {
        path: '/',
        component: '../layouts/BasicLayout',
        authority: ['admin', 'user'],
        routes: [
          {
            path: '/',
            redirect: '/manage/git/list'
          },
          {
            path: '/manage',
            name: 'configManage',
            routes: [
              {
                path: '/manage/git/list',
                name: 'gitList',
                component: './gitManage/gitList'
              },
              {
                path: '/manage/git/:id',
                name: 'gitEdit',
                hideInMenu: true,
                component: './gitManage/gitEdit'
              },
              {
                path: '/manage/template/list',
                name: 'templateList',
                component: './templateManage/index'
              },
              {
                component: './404',
              }
            ]
          },
          // {
          //   path: '/compile',
          //   name: 'compileManage'
          // }
          {
            component: './404',
          }
        ]
      },
      {
        component: './404',
      }
    ]
  },
  {
    component: './404',
  },
];
