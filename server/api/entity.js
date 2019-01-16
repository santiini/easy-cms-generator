const guidFn = require('../utils/guid')
const apiFormat = require('../utils/apiFormat')
const tableName = 'entity'
const commonCRUD = require('./utils/commonCRUD.js')(tableName)

module.exports = {
  add(req, res, pool) {
    var id = guidFn()
    createPage(req.body.basic, id)
    commonCRUD.add(req, res, pool, id)
  },
  edit(req, res, pool) {
    createPage(req.body.basic, req.params.id)
    commonCRUD.edit(req, res, pool)
  },
  remove(req, res, pool) {
    removePage(req.params.id)
    commonCRUD.remove(req, res, pool)
  }
}

/*
* 将新增的实体，有条件的同步到 列表，更新页面 和对应的路由。
* 同步条件：实体设置了有列表页/更新页，但列表或更新表没有那条数据，则创建。
* 如果已有列表或更新页，不做覆盖和删除的处理。
*/
function createPage(data, entityId) {
  
  if(data.hasListPage) {
    addPageAndRoute(data, entityId, 'list')
  }

  if(data.hasUpdatePage) {
    addPageAndRoute(data, entityId, 'update')
  }
}

function addPageAndRoute(entityBasic, entityId, pageType) {
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
  console.log(hasPage)
  if(!hasPage) {
    var entityType = global.db
                        .get('entityType')
                        .find({
                          id: entity.entityTypeId
                        })
                        .value()

    // console.log(entity.entityTypeId + ';' + entityType)
    // 新增页面
    global.db
      .get(`${pageType}Page`)
      .push(Object.assign({
        id: guidFn(),
        updateAt: Date.now()
      }, {
        "basic": {
          entity,
          "codePath": `${entityType ? `${entityType.key}/` : ''}${entityName}`
        }
      }))
      .write()
    
    
    // 新增路由
    global.db
      .get('router')
      .push({
        entityId,
        name: `${entityBasic.des}${pageType === 'list'? '列表页' : '更新页'}`,
        pageType,
        routePath: `${entityType ? `/${entityType.key}` : ''}/${entityName}/${pageType === 'list' ? 'list' : 'update/:id'}`,
        filePath: `${entityType ? `/${entityType.key}` : ''}/${entityName}/${pageType === 'list' ? 'List' : 'Update'}.vue`,
        updateAt: Date.now()
      })
      .write()
  }
}

/*
* 删除实体，删除对应的页面
*/
function removePage(entityId) {
  
  
  var hasUpatePage = global.db.get('updatePage').filter(page => {
    return page.basic.entity.id === entityId
  }).value()[0]
  if(hasUpatePage) {
    global.db
    .get('updatePage')
    .remove({
      id: hasUpatePage.id,
    })
    .write()
  }
}

function removePageAndRouter(entityId, pageType) {
  var hasPage = global.db.get('listPage').filter(page => {
    return page.basic.entity.id === entityId
  }).value().length > 0
  if(hasPage) {
    
    global.db
      .get(`${pageType}Page`)
      .remove({
        id: hasPage.id,
      })
      .write()

    global.db
      .get('router')
      .remove({
        entityId,
      })
      .write()
  }
}