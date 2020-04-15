<template lang="pug">
  div
    div#artboard.artboard(
      ref="artboard"
      :class="{ 'is-sorting': $builder.isSorting, 'is-editable': $builder.isEditing }"
    )
      draggable(
          v-model="$builder.sections"
          :options="{ sort: true, group: { name: 'artboard', pull: false, put: true }}"
          @start="drag=true"
          @end="drag=false"
          @add="onAdd"
          @update="onUpdate"
        )
          component(v-for='section in $builder.sections'
            :is='section.name'
            :key='section.id'
            :id='section.id'
          )

      div.page--copy(
        v-if='!$builder.sections.length'
      ) There are no email sections yet. To start adding, please select a section on the right and click on it.

    .controller
      .controller-intro(v-if="showIntro && !this.$builder.sections.length")
        label(for="projectName") Hello, start your project
        input.controller-input(
          id="projectName"
          placeholder="project name"
          v-model="title"
        )
        template(v-if="themes")
          .controller-themes
            button.controller-theme(
              v-for="theme in themes"
              @click="addTheme(theme)"
            )
              | {{ theme.name }}

      .controller-panel
        button.btn.m-mini.m-expected-action(
          v-if="actions.includes('save')"
          v-text="'Save'"
          @click="submit"
        )

        button.btn.m-mini.m-danger(
          v-if="!tempSections && actions.includes('clear') && $builder.sections.length"
          v-text="'Clear all'"
          @click="clearSections"
        )

        button.btn.m-mini(
          v-if="tempSections && actions.includes('undo')"
          v-text="'Undo'"
          @click="undo"
        )

        button.btn.m-mini(
          v-if="actions.includes('toggle-menu')"
          :class="{ 'is-red': listShown, 'is-rotated': listShown }"
          :disabled="!$builder.isEditing"
          v-text="listShown ? 'Close Menu' : 'Open menu'"
          @click="newSection"
        )

    ul.menu(:class="{ 'is-visiable': listShown }" ref="menu")
      li.menu-group(v-for="(group, name) in groups"  v-if="group.length")
        .menu-header(@click="toggleGroupVisibility")
          span.menu-title {{ name }}
          span.menu-icon
            VuseIcon(name='arrowDown')
        .menu-body
          draggable(
              v-model="group"
              :options="{ sort: false, group: { name: `sections-group-${name}`, pull: 'clone', put: false } }"
              @start="onDrag"
            )
            a.menu-element(
              v-for="section in group"
              :key="section.name"
              :data-section="section.name"
              @click="addSection(section)"
            )
              img.menu-elementImage(v-if="section.cover" :src="section.cover")
              span.menu-elementTitle {{ section.name }}

</template>

<script>
import draggable from 'vuedraggable';
import VuseIcon from './VuseIcon';

export default {
  name: 'VuseBuilder',
  components: {
    VuseIcon,
    draggable
  },
  props: {
    showIntro: {
      type: Boolean,
      default: true
    },
    data: {
      type: Object,
      default: () => ({
        title: '',
        sections: []
      })
    },
    supportGroups: {
      type: Array,
      default: () => []
    },
    alwaysShowMenu: {
      type: Boolean,
      default: false
    },
    actions: {
      type: Array,
      default: () => ['save', 'undo', 'clear', 'toggle-menu']
    }
  },
  data () {
    return {
      title: null,
      listShown: false,
      tempSections: null,
      sections: this.getSections(),
      currentSection: '',
      groups: {}
    }
  },

  watch: {
    title (value) {
      this.$builder.title = value;
      document.title = value;
    }
  },
  created () {
    // sets the initial data.
    this.$builder.set(this.data);
    this.title = this.$builder.title;
    this.themes = this.$builder.themes;
    this.generateGroups();
    this.$set(this, 'sections', this.getSections());
  },
  mounted () {
    this.$builder.rootEl = this.$refs.artboard;
    this.$parent.$on('saveVuseTemplate', this.submit);

    this.$on('vuseRemoveSection', (section) => {
      const sectionObj = this.$builder.sections.find(sec => sec.id === section.id)
      if (sectionObj) {
        this.$builder.remove(sectionObj);
      }
    });

    this.$parent.$on('vuseClearAll', this.clearSections);
    this.$set(this, 'listShown', this.alwaysShowMenu);
  },

  updated () {
    if (this.$builder.scrolling) {
      this.$builder.scrolling(this.$refs.artboard);
    }
  },

  beforeDestroy () {
    this.$parent.$off('saveVuseTemplate');
    this.$off('vuseRemoveSection');
    this.$parent.$off('vuseClearAll');
    this.$builder.clear();
  },
  methods: {
    newSection () {
      // add the section immediately if none are present.
      if (this.sections.length === 1) {
        this.addSection(this.sections[0]);
        return;
      }
      this.toggleListVisibility();
    },
    addSection (section, position) {
      this.$builder.add(section, position === undefined ? this.$builder.sections.length : position);
    },
    clearSections () {
      this.tempSections = this.$builder.clear();
      setTimeout(() => {
        this.tempSections = null;
      }, 5000);
    },
    undo () {
      this.$builder.sections = [...this.tempSections];
      this.tempSections = null;
    },
    addTheme (theme) {
      this.$builder.set(theme);
    },
    onDrag(event) {
      const currentSection = this.sections.find(sec => sec.name === event.item.text);
      this.$set(this, 'currentSection', currentSection);
    },
    toggleListVisibility () {
      this.listShown = !this.listShown;
    },
    showList () {
      this.listShown = true;
    },
    hideList () {
      this.listShown = false;
    },
    toggleGroupVisibility (e) {
      const element = e.target;
      const group = element.closest('.menu-group');
      group.classList.toggle('is-visiable');
    },
    submit () {
      this.$emit('saved', this.$builder);
    },
    generateGroups () {
      let groups = { random: [] };

      // group sections together
      this.sections.forEach((section) => {
        let sectionGroup = section.group;

        if (this.supportGroups.length && !this.supportGroups.includes(sectionGroup)) {
          return;
        }

        if (!sectionGroup) {
          groups.random.push(section);
          return;
        }
        if (!groups[sectionGroup]) {
          groups[sectionGroup] = [section];
          return;
        }
        groups[sectionGroup].push(section);
      });
      this.groups = groups;
    },
    getSections () {
      let sections = [];

      // get sections data
      sections = Object.keys(this.$builder.components).map((sec) => {
        return {
          name: sec,
          group: this.$builder.components[sec].options.group,
          cover: this.$host + this.$builder.components[sec].options.cover,
          schema: this.$builder.components[sec].options.$schema,
          isRemovable: ('isRemovable' in this.$builder.components[sec].options) ? !!this.$builder.components[sec].options.isRemovable : true
        }
      });
      return sections;
    },

    onAdd (evt) {
      this.addSection(this.currentSection, evt.newIndex);
    },

    onUpdate (evt) {
      this.$builder.sort(evt.oldIndex, evt.newIndex);
    }
  }
};
</script>

<style lang="stylus">
@import '../stylus/_app.styl'

.artboard
  transform-origin: top center
  &.is-editable .is-editable
    outline: none
    &:hover
      box-shadow: inset 0 0 0 2px $gray
.controller
  box-sizing: border-box
  &-panel
    position: fixed
    z-index: 200
    bottom: 30px
    right: 0
    width: 250px
    display: flex
    justify-content: center
    .btn
       margin: 0 4px
  &-input
    outline: none
    border: 1px solid $gray
    padding: 0.5em 1em
    margin: 20px 0
    border-radius: 40px
    width: 100%
    font-size: 16px
    &:focus
      border-color: $blue
      box-shadow: 0 0 0 2px alpha($blue, 50%)
  &-button
    transition: 0.2s
    border: none
    outline: none
    border-radius: 20px
    padding: 5px
    color: $white
    fill: $white
    font-size: 16px
    svg
      transition: 0.2s
    &:not(:last-child)
      margin-right: 20px
    &.is-rotated >svg
      transform: rotate(45deg)
    &:hover
      @extends $floatHover
    &.is-blue
      background-color: $blue
      &:hover
        background-color: darken($blue, 20%)
    &.is-red
      background-color: $red
      &:hover
        background-color: darken($red, 20%)
    &.is-green
      background-color: $green
      &:hover
        background-color: darken($green, 20%)
    &.is-dark
      background-color: $dark
      &:hover
        background-color: darken($dark, 20%)
    &.is-gray
      background-color: $gary
      &:hover
        background-color: darken($gray, 20%)
  &-intro
    width: 100%
    max-width: 500px
    margin: auto
    display: flex
    justify-content: center
    align-items: center
    flex-direction: column
    padding: 70px 50px
    text-align: center
    font-size: 30px
    color: $dark

  &-themes
    display: flex
    flex-direction: column
    width: 100%

  &-theme
    background-color: $white
    color: $dark
    border: 1px solid $gray
    margin: 5px
    padding: 20px
    border-radius: 4px
    width: 100%
    cursor: pointer
    font-size: 16px
    &:hover
      border-color: $blue
.menu
  user-select: none
  -moz-user-select: none
  position: fixed
  z-index 300
  top: 0
  left: 0
  bottom: 0
  margin: 0
  width: 250px
  background: $white
  padding: 20px 10px
  display: flex
  flex-direction: column
  overflow-y: auto
  list-style: none
  transition: 0.4s
  box-shadow: 1px 0 10px alpha($dark, 20%)
  transform: translate3d(-100%, 0, 0)
  &.is-visiable
    transform: translate3d(0, 0, 0)
  &-body
    display: none
    padding: 0
    margin: 0
    list-style: none
    ~/-group &
      width: 90%
      margin: 10px auto
    ~/-group.is-visiable &
      display: block
  &-icon
    width: 24px
    height: 24px
    fill: $gray
    transition: 0.2s
    ~/-group.is-visiable &
      transform: rotate(180deg)

  &-element
    position: relative
    display: flex
    justify-content: center
    align-items: center
    width: 100%
    min-height: 50px
    border-radius: 5px
    background: darken($gray, 10%)
    transition: 0.3s
    cursor: pointer
    color: $white
    overflow: hidden
    user-select: none
    -moz-user-select: none
    &:not(:last-child)
      margin-bottom: 10px
    &:hover
      @extends $floatHover

  &-elementImage
    max-width: 100%
    pointer-events: none
    +
      ~/-elementTitle
        position: absolute
        right: 0
        bottom: 0
        left: 0
        text-shadow: 1px 1px 2px alpha($black, 80%)
        text-align: center
        padding: 5px

  &-header
    display: flex
    justify-content: space-between
    align-items: center
    padding: 10px 5px
    border-bottom: 1px solid alpha($black, 5%)

.sortable-ghost
  opacity: 0.3
  box-shadow: 0 0 2px 1px $blue

.is-editable
  &:hover
    box-shadow: inset 0 0 0 2px $gray
</style>
