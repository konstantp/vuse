<template lang="pug">
  .styler(
    ref="styler"
    id="styler"
    v-if="$builder.isEditing"
    :class="{ 'is-visible': isVisible }"
    @click.stop=""
  )
    ul.styler-list
      //- li(v-if="type === 'button' || type === 'section'")
        button.styler-button(@click="updateOption('colorer')")
          VuseIcon(name='palettes')
      li(v-if="type === 'button'")
        button.styler-button(@click="updateOption('link')")
          VuseIcon(name='link')
      li(v-if="type === 'header' || (type === 'section' && section.isRemovable)")
        button.styler-button(@click="removeSection")
          VuseIcon(name='trash')
      template(v-if="type === 'text'")
        //- li: button.styler-button(@click="updateOption('textColor')")
            VuseIcon(name='palettes')
        li: button.styler-button(@click="updateOption('align')")
            VuseIcon(name='align')
        li: button.styler-button(@click="updateOption('textStyle')")
            VuseIcon(name='textStyle')
      template(v-if="type === 'grid'")
        li: button.styler-button(@click="selectDevice('mobile')")
            VuseIcon(name='mobile')
        //- li: button.styler-button(@click="selectDevice('tablet')")
        //-     VuseIcon(name='tablet')
        li: button.styler-button(@click="selectDevice('desktop')")
            VuseIcon(name='laptop')
        //- li: button.styler-button(@click="selectDevice('widescreen')")
        //-     VuseIcon(name='monitor')

    ul.styler-list
      li(v-if="currentOption === 'colorer'")
        ChromePicker(v-model="colorerColor")

      li(v-if="currentOption === 'textColor'")
        ChromePicker(v-model="textColor")

      li(v-if="currentOption === 'link'")
        .input-group.is-rounded.has-itemAfter.is-primary
          input.input(type="text" placeholder="type your link" v-model="url")
          button.button(@click="addLink")
            VuseIcon(name='link')

      li(v-if="currentOption === 'align'")
        ul.align
          li: button.styler-button(@click="execute('justifyleft')")
            VuseIcon(name='left')
          li: button.styler-button(@click="execute('justifycenter')")
            VuseIcon(name='center')
          li: button.styler-button(@click="execute('justifyright')")
            VuseIcon(name='right')

      li(v-if="currentOption === 'textStyle'")
        ul.align
          li: button.styler-button(@click="execute('bold')")
            VuseIcon(name='bold')
          li: button.styler-button(@click="execute('italic')")
            VuseIcon(name='italic')
          li: button.styler-button(@click="execute('underline')")
            VuseIcon(name='underline')

      li(v-if="currentOption === 'columnWidth'")
        ul.align
          li: button.styler-button(@click="gridValue--")
            VuseIcon(name='arrowLeft')
          li: input(type="number" min="0" max="12" v-model="gridValue").styler-input
          li: button.styler-button(@click="gridValue++")
            VuseIcon(name='arrowRight')

</template>

<script>
import Popper from 'popper.js';
import VuseIcon from './VuseIcon';
import { isParentTo } from './../util';
var VueColor = require('vue-color');

export default {
  name: 'Styler',
  components: {
    VuseIcon,
    ChromePicker: VueColor.Chrome
  },
  props: {
    el: {
      type: Object,
      required: true
    },
    type: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    section: {
      type: Object,
      required: true
    }
  },
  data: () => ({
    textColor: '',
    colorerColor: '',
    oldColorerColor: '',
    mouseTarget: '',
    currentOption: '',
    url: '',
    gridValue: 0,
    isVisible: false
  }),
  watch: {
    colorerColor: function (newVal) {
      this.changeColor(newVal);
    },
    textColor: function (newVal) {
      this.execute('forecolor', this.getRGBA(newVal));
    },
    gridValue: function () {
      this.gridValue = Math.min(Math.max(this.gridValue, 0), 12);
      this.section.set(this.name, (grid) => {
        grid[this.device] = this.gridValue;
      });
    }
  },
  created () {
    if (this.type === 'button') {
      this.url = this.section.get(`${this.name}.href`);
      this.el.contentEditable = 'true';
    }
    if (this.type === 'text') {
      this.el.contentEditable = 'true';
    }
  },
  mounted () {
    if (!this.$builder.isEditing) return;

    // add listeners to show/hide styler
    this.el.addEventListener('click', this.showStyler);
  },
  beforeDestroy () {
    this.hideStyler();
    if (this.$refs.styler) {
      this.$refs.styler.remove();
    }
    if (this.el && this.el.classList) {
      this.el.classList.remove('is-editable');
    }
    this.el.removeEventListener('click', this.showStyler);
    document.removeEventListener('click', this.hideStyler, true);
  },
  methods: {
    updateOption (option) {
      this.currentOption = option;
      this.$nextTick(() => {
        this.popper.update();
      })
    },
    addLink () {
      this.section.set(`${this.name}.href`, this.url);
    },
    getRGBA (colorObj) {
      return `rgba(${Object.values(colorObj.rgba).join(', ')})`;
    },
    changeColor (colorObj) {
      const rgba = this.getRGBA(colorObj);
      this.section.inlineStyles = `background-color: ${rgba}`;
      this.section.data.inlineStyles = `background-color: ${rgba}`;
    },
    addClass (className) {
      this.section.set(this.name, (value) => {
        if (value && value.classes && Array.isArray(value.classes)) {
          value = value.classes;
        }
        value.push(className);
      });
    },
    selectDevice (device) {
      const gridValue = this.section.get(this.name)[device];
      this.updateOption('columnWidth');
      this.device = device;
      this.gridValue = gridValue;
    },
    removeClass (className) {
      if (Array.isArray(className)) {
        return className.forEach(c => {
          this.removeClass(c);
        });
      }
      this.section.set(this.name, value => {
        if (value && value.classes && Array.isArray(value.classes)) {
          value = value.classes;
        }
        const idx = value.indexOf(className);
        value.splice(idx, 1);
      });
    },
    removeSection () {
      this.$builder.remove(this.section);
    },
    execute (command, value = null) {
      this.el.focus();
      // console.log('execute', command, value);
      document.execCommand(command, false, value);
    },
    showStyler (event) {
      event.stopPropagation();
      if (this.isVisible) return;
      this.isVisible = true;

      // exute popper element
      if (!this.popper) {
        const position = this.$props.type === 'section' ? 'left-start' : 'top';
        this.popper = new Popper(this.el, this.$refs.styler, {
          placement: position
        });
      }
      document.addEventListener('click', this.hideStyler, true);
      this.currentOption = '';
    },
    hideStyler (event) {
      if (
        (event && isParentTo(event.target, this.$el)) ||
        (event && isParentTo(event.target, this.el))
      ) {
        return
      }
      this.isVisible = false;
      if (this.popper) {
        this.popper.destroy();
        this.popper = null;
      }
      document.removeEventListener('click', this.hideStyler, true);

      if (this.type === 'section' || this.type === 'grid') {
        return;
      }
      if (this.type === 'button') {
        this.section.set(`${this.name}.text`, this.el.innerHTML);
        return;
      }

      this.section.set(this.name, this.el.innerHTML);
    }
  }
};
</script>

<style lang="stylus">
@import '~@baianat/base.framework/src/stylus/util/colors'

.styler
  position: absolute
  top: 0
  z-index: 200
  visibility: hidden
  opacity: 0
  margin: 10px 0
  padding: 5px
  background: $dark
  border-radius: 6px
  display: flex
  flex-direction: column
  justify-content: center
  align-items: center
  &-list
    display: flex
    justify-content: center
    align-items: center
    list-style: none
    margin: 0
    padding: 0
  &-input
    background: $white
    color: $dark
    border: 0
    outline: 0
    width: 40px
    height: 40px
    border-radius: 42px
    margin: 0 5px 0 0
    text-align: center
    -webkit-appearance: none
    -moz-appearance: textfield
    appearance: none
  &-button
    display: flex
    justify-content: center
    align-items: center
    outline: 0
    background: $dark
    border: 0
    fill: $white
    color: $white
    width: 42px
    height: 42px
    border-radius: 42px
    margin: 0 5px 0 0
    &:hover
      background: darken($dark, 20%)
    &:first-child
      margin-left: 5px
  &-selector
    margin: 0 5px
  &.is-visible
    visibility: visible
    opacity: 1
  .input-group
    margin: 5px

.align
  @extend .styler-list
  height: 42px

.colorer
  @extend .styler-list
  height: 42px
  li >input
    -webkit-appearance: none
    -moz-appearance: textfield
    appearance: none
    width: 30px
    height: 30px
    border-radius: 40px
    border: 4px solid darken($dark, 20%)
    margin: 0 5px
    outline: none
    &:checked
      border-color: lighten($dark, 20%)
    &:hover
      border-color: lighten($dark, 20%)
    &#colorRed
      background $red
    &#colorBlue
      background $blue
    &#colorGreen
      background $green
    &#colorBlack
      background $black
    &#colorWhite
      background $white

.is-hidden
  display: none

input[type=number]::-webkit-inner-spin-button
input[type=number]::-webkit-outer-spin-button
  -webkit-appearance: none
  margin: 0
</style>
