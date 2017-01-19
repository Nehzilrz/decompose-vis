import Vue from "vue"
import Vuex from 'vuex'
Vue.use(Vuex)

export default new Vuex.Store({

  state: {
    items: [
      {
        content: 'Get Milk one',
        selected: false
      },
      {
        content: 'Get Water two',
        selected: false
      },
      {
        content: 'Get Bread three',
        selected: false
      },
      {
        content: 'Get shampoo four',
        selected: false
      },
      {
        content: 'Get juice five',
        selected: false
      }
    ],
    newItem: {
      content: 'be new new new',
      selected: false
    },
    selectedItem:{
    }
  },

  mutations: {
    ADD_ITEM(state) {
      state.items.push(state.newItem)
    },
    REMOVE_ITEM(state, item) {
      let index=state.items.indexOf(item)
      state.items.splice(index, 1)
    },
    SELECT_ITEM(state, item) {
      state.items.forEach(function(i){
        i.selected=false
      })
      item.selected =true
      state.selectedItem=item
    },
    EDIT_ITEM(state, text) {
      let i=state.items.indexOf(state.selectedItem)
      let item=state.items[i]
      item.content=text;
    }
  },

  actions: {
    addItem({commit}) {
      commit('ADD_ITEM')
    },
    removeItem({commit}, item) {
      commit('REMOVE_ITEM', item)
    },
    selectItem({commit},item) {
      commit('SELECT_ITEM',item)
    },
    editItem({commit}, text) {
      commit('EDIT_ITEM',text)
    }
  },
  getters: {
    newItem: state => state.newItem,
    items: state => state.items,
    selectedItem: state => state.selectedItem
  }
})