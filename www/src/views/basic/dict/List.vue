<template>
  <div class="main">
    <div class="ly ly-r mb-10">
      <el-button type="primary" @click="add">新增</el-button>
    </div>
    <el-table
      :data="list"
      border
      stripe>
      <el-table-column
        type="index"
        label="序列"
        align="center"
        width="80">
      </el-table-column>
      <el-table-column
        prop="label"
        label="名称"
        >
        <template slot-scope="scope">
          <el-input v-model="scope.row.label" @change="scope.row.hasChanged = true"></el-input>
        </template>
      </el-table-column>
      <el-table-column
        prop="key"
        label="值"
        >
        <template slot-scope="scope">
          <el-input v-model="scope.row.key" @change="scope.row.hasChanged = true"></el-input>
        </template>
      </el-table-column>
      <el-table-column
        prop="key"
        label="操作"
        >
        <template slot-scope="scope">
          <el-button type="success" size="small" @click="showItems(scope.row, scope)">编辑子项目</el-button>
          <el-button type="info" size="small" @click="save(scope.row)"  v-show="scope.row.hasChanged">保存</el-button>
          <el-button type="danger" size="small" @click="remove(scope.row.id, scope.$index)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-dialog title="详情" :visible.sync="isShowDetailDialog">
      <div class="ly ly-r mb-10">
        <el-button type="primary" @click="currData.push({
          key: '',
          label: ''
        })">新增</el-button>
      </div>
      <el-table
        :data="currData"
        border
        stripe>
        <el-table-column
          type="index"
          label="序列"
          align="center"
          width="80">
        </el-table-column>
        <el-table-column
          prop="label"
          label="名称"
          >
          <template slot-scope="scope">
            <el-input v-model="scope.row.label" @change="currRow.hasChanged = true"></el-input>
          </template>
        </el-table-column>
        <el-table-column
          prop="key"
          label="值"
          >
          <template slot-scope="scope">
            <el-input v-model="scope.row.key" @change="currRow.hasChanged = true"></el-input>
          </template>
        </el-table-column>
        <el-table-column
          prop="key"
          label="操作"
          >
          <template slot-scope="scope">
            <el-button type="danger" @click="removeSubItem(scope.$index)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
        
      <span slot="footer" class="dialog-footer">
        <el-button @click="isShowDetailDialog=false">关 闭</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script src="./list.js">

</script>

<style scoped></style>