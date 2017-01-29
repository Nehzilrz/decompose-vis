import {
    ADD_ITEM,
    REMOVE_ITEM,
    SELECT_ITEM,
    EDIT_ITEM,
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
    [EDIT_ITEM]({ commit }, text) {
        commit(EDIT_ITEM, text);
    },
};

export default actions;
