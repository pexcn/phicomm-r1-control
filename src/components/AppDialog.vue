<script setup lang="ts">
defineOptions({ inheritAttrs: false });
</script>

<template>
  <Teleport to="body">
    <md-dialog v-bind="$attrs"><slot /></md-dialog>
  </Teleport>
</template>
