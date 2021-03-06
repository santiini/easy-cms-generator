const guidFn = require('../utils/guid')
const apiFormat = require('../utils/apiFormat')
const tableName = 'entity'
const commonCRUD = require('./utils/commonCRUD.js')(tableName)
const curdGenerator = require('./utils/generator-code/server/crud')
const generatorTestData = require('./utils/generator-code/server/generator-test-data')
const syncService = require('./config')
const syncAllConfig = syncService.syncAllConfig
const syncConfig = syncService.sync
const expendListPage = require('./list-page').expendCofigToFile
const expendUpdatePage = require('./update-page').expendCofigToFile
const removeListPage = require('./list-page').removeService
const removeUpdatePage = require('./update-page').removeService
const fs = require('fs-extra')



module.exports = {
  list(req, res, pool) {
    try {
      var results = global.db.get(tableName)
                          .orderBy('order', 'asc')
                          .value()
      results = results.map(entity => {
        let entityType = global.db
                        .get('entityType')
                        .find({
                          id: entity.basic.entityTypeId
                        })
                        .value()
        let entityTypeName = entityType ? (entityType.label || '未命名') : '-'

        if(entity.basic.hasListPage) {
          let page = global.db
                        .get('listPage')
                        .filter(page => {
                          return page.basic.entity.id === entity.id
                        })
                        .value()[0]
          if(page) {
            entity.basic.listPageId = page.id
          }
        }

        if(entity.basic.hasUpdatePage) {
          let page = global.db
                        .get('updatePage')
                        .filter(page => {
                          return page.basic.entity.id === entity.id
                        })
                        .value()[0]
          if(page) {
            entity.basic.updatePageId = page.id
          }
        }
        return {
          ...entity,
          entityTypeName
        }
      })
      res.send(apiFormat.success(results))
    } catch(error) {
      res.send(apiFormat.error(error))
    }
  },
  detail(req, res, pool) {
    commonCRUD.detail(req, res, pool, req.params.id)
  },
  add(req, res, pool) {
    try {
      var id = guidFn()
      commonCRUD.add(req, res, pool, id)
      syncAll(id)
    } catch(error) {
      console.log(error)
      res.send(apiFormat.error(error))
    }
  },
  edit(req, res, pool) {
    try {
      var id = req.params.id
      commonCRUD.edit(req, res, pool)
      syncAll(id)
    } catch(error) {
      console.log(error)
      res.send(apiFormat.error(error))
    }
  },
  remove(req, res, pool) {
    const id = req.params.id
    var entity = global.db.get(tableName)
              .find({
                id,
              }).value()
    var entityType = global.db
                .get('entityType')
                .filter(type => type.id === entity.basic.entityTypeId)
                .value()[0]
    var entityTypeName
    if(entityType) {
      entityTypeName = entityType.key
    }

    removePage(id)
    commonCRUD.remove(req, res, pool)
    syncAllConfig() // 所有配置文件
    // 删除服务器端文件。弹出的，就不管了。
    if(!entity.isEjected) {
      fs.remove(`${global.serverCodeRootPath}/app/service/auto/${entityTypeName ? `${entityTypeName}/` : ''}model/${entity.basic.name}.js`)
      fs.remove(`${global.serverCodeRootPath}/app/service/auto/${entityTypeName ? `${entityTypeName}/` : ''}${entity.basic.name}.js`)
      fs.remove(`${global.serverCodeRootPath}/app/controller/auto/${entityTypeName ? `${entityTypeName}/` : ''}${entity.basic.name}.js`)
    }
  },
  commonCols(req, res, pool) {
    try {
        var results = global.db.get('entityConfig')
                            .value()
                            .commonCols
        res.send(apiFormat.success(results))
      } catch(error) {
        res.send(apiFormat.error(error))
      }
  },
  // 弹出。 改生成的代码，需要弹出。不可逆操作
  eject(req, res, pool) {
    try {
      var id = req.params.id
      global.db.get(tableName)
              .find({
                id,
              })
              .assign({
                isEjected: true,
                updateAt: Date.now()
              })
              .write()
      syncAll(id, true) // 展开代码到服务器端
      res.send(apiFormat.success({}))
    } catch(e) {
      console.log(e)
      res.send(apiFormat.error(e))
    }
  },
  // 生成测试的数据
  generatorTestData(req, res) {
    try {
      var results = generatorTestData()
      res.send(apiFormat.success(results))
    } catch(error) {
      console.error(error)
      res.send(apiFormat.error(error))
    }
  }
}

function syncAll(id) {
  var entity = global.db
                  .get(tableName)
                  .find({
                    id
                  })
                  .value()
  var basic = entity.basic
  createPage(entity, id) // 前端页面
  if(basic.hasListPage && basic.isShowInMenu) { // 菜单
    addMenu(basic, id)
  }
  
  var entityType = global.db
                .get('entityType')
                .filter(type => type.id === entity.basic.entityTypeId)
                .value()[0]

  var commonCols = global.db.get('entityConfig')
                          .value()
                          .commonCols
  // 生成 后端的crud 代码
  curdGenerator(entity, entityType ? entityType.key : false, commonCols) // 同步的方法。写文件也用的同步的
  global.db
        .get(tableName)
        .find({
          id
        })
        .assign({
          updateAt: Date.now()
        })
        .write()
  syncAllConfig() // 同步配置
}

/*
* 将新增的实体，有条件的同步到 列表，更新页面 和对应的路由。
* 同步条件：实体设置了有列表页/更新页，但列表或更新表没有那条数据，则创建。
* 如果已有列表或更新页，不做覆盖和删除的处理。
*/
function createPage(entity, entityId) {
  if(entity.basic.hasListPage) {
    let pageId = addPageAndRoute(entity.basic, entity.cols, entityId, 'list')
  }

  if(entity.basic.hasUpdatePage) {
    let pageId = addPageAndRoute(entity.basic, entity.cols, entityId, 'update')
  }
}



function addPageAndRoute(entityBasic, entityCols, entityId, pageType) {
  const entityName = entityBasic.name
  var entity = { // 页面的entity
    id: entityId,
    name: entityName,
    entityTypeId: entityBasic.entityTypeId
  }

  var hasPage = global.db.get(`${pageType}Page`)
                            .filter(page => {
                              return page.basic.entity.id === entityId
                            })
                            .value().length > 0
  if(!hasPage) {
    var entityType = global.db
                        .get('entityType')
                        .find({
                          id: entity.entityTypeId
                        })
                        .value()
    var pageId = guidFn()
    // 新增页面
    global.db
      .get(`${pageType}Page`)
      .push(Object.assign({
        id: pageId,
        updateAt: Date.now()
      }, {
        "basic": {
          entity,
          "codePath": `${entityType ? `${entityType.key}/` : ''}${entityName}`
        },
        // 必填项直接同步过去
        cols: entityCols.filter(col => col[`isSyncTo${pageType === 'list' ? 'List' : 'Update'}Page`])
                        .map(col => {
                            return {
                              key: col.key,
                              label: col.label,
                              dataType: col.dataType,
                              formatFn: null,
                              required: true
                            }
                        })
      }, pageType === 'list' ? {
        operate: {
          add: {
            isShow: true,
          },
          edit: {
            isShow: true
          },
          detail: {
            isShow: true
          },
          delete: {
            isShow: true
          }
        },
      } : {}))
      .write()
    
    // 展开页面
    if(pageType === 'list') {
      expendListPage(pageId)
    } else {
      expendUpdatePage(pageId)
    }
    
    // 新增路由
    global.db
      .get('router')
      .push({
        id: guidFn(),
        entityId,
        name: `${entityBasic.des}${pageType === 'list'? '列表页' : '更新页'}`,
        pageId,
        pageType,
        routePath: `${entityType ? `/${entityType.key}` : ''}/${entityName}/${pageType === 'list' ? 'list' : 'update/:id'}`,
        filePath: `${entityType ? `${entityType.key}/` : ''}${entityName}/${pageType === 'list' ? 'List' : 'Update'}.vue`,
        updateAt: Date.now()
      })
      .write()

  }
}

// 新增菜单
function addMenu(entityBasic, entityId) {
  var entityType = global.db
                        .get('entityType')
                        .find({
                          id: entityBasic.entityTypeId
                        })
                        .value()
  var menu = global.db
                    .get('menu')
                    .value()

  var tarRouter = global.db
                        .get('router')
                        .find({
                          entityId: entityId
                        })
                        .value()

  var needAddPage = {
    routerId: tarRouter.id,
    name: entityBasic.des || entityBasic.name,
    "showType": "show",
    "roleIds": []
  }

  if(entityType) { // 归属于某个分类
    var tarMenuItem
    var tarPages
    menu.forEach(item => {
      if(item.entityTypeId === entityBasic.entityTypeId) {
        tarMenuItem = item
      }
    })
    
    if(tarMenuItem) {// 已经有分类
      tarMenuItem.children = tarMenuItem.children || []
      tarPages = tarMenuItem.children
      var hasPage = tarPages.filter(item => item.routerId === needAddPage.routerId).length > 0
      if(!hasPage) {
        tarPages.push(needAddPage)
      }
    } else {
      menu.push({
        id: guidFn(),
        "isPage": 0,
        "entityTypeId": entityType.id,
        "routerId": null,
        "name": entityType.label || entityType.key,
        "updateAt": Date.now(),
        children: [needAddPage]
      })
    } 
  } else { // 无分类
    var hasPage = menu.filter(item => item.routerId === needAddPage.routerId).length > 0
    if(!hasPage) {
      menu.push({
        id: guidFn(),
        "isPage": 1,
        "entityTypeId": null,
        "routerId": needAddPage.routerId,
        "name": needAddPage.name,
        "updateAt": Date.now(),
      })
    }
  }

  global.db.set('menu', menu).write()

}

/*
* 删除实体，删除对应的页面
*/
function removePage(entityId) {
  var entityBasic = global.db
                    .get('entity')
                    .find({
                      id: entityId
                    })
                    .value()
                    .basic
  try {
    var pageFold = removeListPage(entityBasic.listPageId, true)
    var pageFold2 = removeUpdatePage(entityBasic.updatePageId, true)
    pageFold = pageFold || pageFold2 // 有可能列表页删除过了，但更新页没删
    if(pageFold) {
      fs.removeSync(pageFold) // 删除文件夹
    }
  } catch(e) {
    console.error(e)
  }
}