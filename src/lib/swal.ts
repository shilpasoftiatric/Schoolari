import Swal from 'sweetalert2';

const customSwal = Swal.mixin({
  customClass: {
    popup: 'bg-white/95 backdrop-blur-xl border border-slate-200/60 shadow-2xl rounded-3xl !p-2 !pb-6',
    title: 'text-2xl font-black text-slate-900 tracking-tight mt-4',
    htmlContainer: 'text-slate-600 font-medium leading-relaxed',
    confirmButton: 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold py-3 px-8 rounded-xl shadow-lg shadow-violet-500/30 transition-all duration-200 hover:scale-[1.02] active:scale-95',
    cancelButton: 'bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-8 rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-95',
    actions: 'flex gap-4 mt-6',
    icon: '!mt-6 !mb-2 !mx-auto',
  },
  buttonsStyling: false,
  showClass: {
    popup: 'animate-in zoom-in-95 duration-200 ease-out'
  },
  hideClass: {
    popup: 'animate-out zoom-out-95 duration-150 ease-in'
  }
});

export default customSwal;
