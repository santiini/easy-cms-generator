import * as types from './mutation-types'
import { fetchList } from '@/service/api'
import axios from 'axios'

export const setUser = ({ commit }, user) => {
  commit(types.USER_INFO, user)
}

import {menuConfig} from '@/setting'
// 这边是加所有定义了路由的页面
var menus = []
menuConfig.forEach(menu => {
  var parent = menu
  if(menu.children) { // 二级菜单
    var subMenu = menu.children.map(item => {
      return {
        "id": item.id,
        "name": item.name,
        role: item.role,
        path: item.mainPage.routePath,
      }
    })
    return menus.push({
      id: parent.id,
      name: parent.name,
      role: parent.role,
      children: subMenu
    })
  } else { // 一级菜单
    return menus.push({
      id: parent.id,
      name: parent.name,
      role: parent.role,
      path: menu.mainPage.routePath
    })
  }
})

console.log(menus)

export const fetchMenuAndLimit = ({ commit, state, getters }) => {
  var role = state.role
  var currentMenus = menus.filter(menu => {
    if(menu.role) {
      if(menu.role !== role) {
        return false
      } else {
        if(menu.children) {
          menu.children = menu.children.filter(item => {
            if(item.role) {
              return item.role === role
            }
            return true
          })
        }
        return true
      }
    } else {
      if(menu.children) {
        menu.children = menu.children.filter(item => {
          if(item.role) {
            return item.role === role
          }
          return true
        })
      }
      return true
    }
  })

  // 可以根据 process.env.NODE_ENV 来判断拿的值
  commit(types.MENU_LIMIT, {
      data: {
        menu: currentMenus,
        limit: {}
      }
  })
}

// 这些配置以后放在服务器
import {
  entitiesConfig,
  navMenuConfig,
  uitlFnsConfig,
  listPagesConfig,
  updatePagesConfig
} from '@/setting'

export const fetchBasicData = ({ commit, state, getters }) => {
  // const loadDataNum = 5
  var loadedNum = 0
  
  fetchList('role').then(({data}) => {
    commit(types.ROLES, data.data)
    loadedNum++
  })

  fetchList('dict').then(({data}) => {
    commit(types.DICT, data.data)
    loadedNum++
  })

  fetchList('entity').then(({data}) => {
    commit(types.ENTITIES, data.data)
    loadedNum++
  })

  commit(types.NAV_MENU, navMenuConfig)
  commit(types.UTIL_FN, uitlFnsConfig)
  commit(types.LIST_PAGES_CONFIG, listPagesConfig)
  commit(types.UPDATE_PAGES_CONFIG, updatePagesConfig)
  // 所有数据加载完成
  commit(types.BASIC_DATA_LOADED)
  
}

