import {
    ADD_ITEM,
    REMOVE_ITEM,
    SELECT_ITEM,
    EDIT_ITEM,
    UPDATE_ITEM,
    SELECT_BLOCK,
} from './types';

const actions = {
    [ADD_ITEM]({ commit }) {
        commit(ADD_ITEM);
    },
    [REMOVE_ITEM]({ commit }, item) {
        commit(REMOVE_ITEM, item);
    },
    [SELECT_ITEM]({ commit }, item) {
        commit(SELECT_ITEM, item);
    },
    [SELECT_BLOCK]({ commit }, block) {
        commit(SELECT_BLOCK, block);
    },
    [EDIT_ITEM]({ commit }, text) {
        commit(EDIT_ITEM, text);
    },
    [UPDATE_ITEM]({ commit }, items) {
        commit(UPDATE_ITEM, items);
    },
};

export default actions;
