<script setup lang="ts">
withDefaults(defineProps<{ disabled?: boolean }>(), { disabled: false });
</script>

<template>
  <md-ripple :disabled="disabled" />
  <md-focus-ring />
</template>
