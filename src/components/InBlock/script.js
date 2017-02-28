import draggable from 'vuedraggable';
import markv from '../mark';
import { mapGetters, mapActions, mapState } from 'vuex';
import { ADD_MARK } from '../../store';

export default {
    computed: {
        ...mapGetters({
            block: 'selectedBlock',
        }),
        ...mapState({
            marksTemp: 'marksTemp',
        }),
    },
    components: {
        draggable,
        markv,
    },
    methods: {
        ...mapActions({
            addMark: ADD_MARK,
        }),
    },
};
