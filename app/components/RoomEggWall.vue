<script setup lang="ts">
defineProps<{ front: boolean }>()

const behindGradient = 'radial-gradient(farthest-side circle at var(--pointer-x) var(--pointer-y), hsla(280,100%,70%,var(--card-opacity)) 4%, hsla(280,50%,50%,calc(var(--card-opacity)*0.75)) 10%, hsla(280,25%,40%,calc(var(--card-opacity)*0.5)) 50%, hsla(280,0%,30%,0) 100%), radial-gradient(35% 52% at 55% 20%, #9C1DE7c4 0%, #073aff00 100%), radial-gradient(100% 100% at 50% 50%, #FF073Aff 1%, #073aff00 76%), conic-gradient(from 124deg at 50% 50%, #581B98ff 0%, #9C1DE7ff 40%, #FF073Aff 60%, #581B98ff 100%)'
const innerGradient = 'linear-gradient(145deg, #581B988c 0%, #FF073A44 100%)'
</script>

<template>
  <div
    class="egg"
    :data-front="front"
  >
    <h2 class="room-heading">
      {{ $t('room.egg.title') }}
    </h2>
    <div
      class="egg__card"
      data-testid="egg-card"
    >
      <ProfileCard
        name="Saulo Vargas"
        title="Senior Full-Stack Engineer"
        handle="saulovargas"
        status="Available"
        contact-text="Email Me"
        contact-href="mailto:saulo@rusticit.com"
        grain-url="/profile-card/grain.webp"
        icon-url="/profile-card/pattern.png"
        avatar-url="/profile-card/Saulo_Vargas_subject_only.webp"
        mini-avatar-url="/profile-card/Saulo_Vargas_subject_only.webp"
        :behind-gradient="behindGradient"
        :inner-gradient="innerGradient"
      />
    </div>
    <a
      class="egg__link"
      href="https://rusticit.com"
      target="_blank"
      rel="noopener"
    >{{ $t('room.egg.open') }}</a>
  </div>
</template>

<style scoped>
.egg__card {
  display: flex;
  justify-content: center;
}

.egg__link {
  display: block;
  margin-top: 12px;
  text-align: center;
  font-weight: 600;
  font-size: 0.85rem;
  color: inherit;
}
</style>
