import svgPaths from "./svg-dfys9abp12";
import imgImage from "figma:asset/c04d60257ad7e68072691efce34e04f87c655c34.png";

function Container() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="Container">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="Container">
          <path d={svgPaths.p300a1100} fill="var(--fill-0, white)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Button() {
  return (
    <div className="backdrop-blur-[6px] bg-[rgba(255,255,255,0.05)] content-stretch flex items-center justify-center p-px relative rounded-[9999px] shrink-0 size-[40px]" data-name="Button">
      <div aria-hidden="true" className="absolute border border-[rgba(255,255,255,0.1)] border-solid inset-0 pointer-events-none rounded-[9999px]" />
      <Container />
    </div>
  );
}

function Heading() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Heading 1">
      <div className="flex flex-col font-['Cinzel:Regular',sans-serif] font-normal h-[20px] justify-center leading-[0] relative shrink-0 text-[14px] text-[rgba(255,255,255,0.7)] tracking-[2.8px] uppercase w-[162.61px]">
        <p className="leading-[20px] whitespace-pre-wrap">Select Artifact</p>
      </div>
    </div>
  );
}

function Container1() {
  return (
    <div className="h-[3.333px] relative shrink-0 w-[13.333px]" data-name="Container">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 13.3333 3.33333">
        <g id="Container">
          <path d={svgPaths.p1fea8500} fill="var(--fill-0, white)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Button1() {
  return (
    <div className="backdrop-blur-[6px] bg-[rgba(255,255,255,0.05)] content-stretch flex items-center justify-center p-px relative rounded-[9999px] shrink-0 size-[40px]" data-name="Button">
      <div aria-hidden="true" className="absolute border border-[rgba(255,255,255,0.1)] border-solid inset-0 pointer-events-none rounded-[9999px]" />
      <Container1 />
    </div>
  );
}

function Header() {
  return (
    <div className="absolute content-stretch flex items-center justify-between left-0 pl-[24px] pr-[24.02px] py-[24px] right-0 top-0" data-name="Header">
      <Button />
      <Heading />
      <Button1 />
    </div>
  );
}

function Container4() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="Container">
      <div className="flex flex-col font-['Liberation_Mono:Regular',sans-serif] h-[16px] justify-center leading-[0] not-italic relative shrink-0 text-[12px] text-[rgba(255,255,255,0.5)] tracking-[1.2px] uppercase w-[134.42px]">
        <p className="leading-[16px] whitespace-pre-wrap">Live at The Void</p>
      </div>
    </div>
  );
}

function Heading1() {
  return (
    <div className="content-stretch flex flex-col items-start pb-[0.75px] relative shrink-0 w-full" data-name="Heading 2">
      <div className="flex flex-col font-['Cinzel:Extra_Bold',sans-serif] h-[75px] justify-center leading-[37.5px] not-italic relative shrink-0 text-[30px] text-white w-[167.67px] whitespace-pre-wrap">
        <p className="mb-0">Neon</p>
        <p>Symphony</p>
      </div>
    </div>
  );
}

function Container3() {
  return (
    <div className="content-stretch flex flex-col gap-[3.25px] items-start relative shrink-0" data-name="Container">
      <Container4 />
      <Heading1 />
    </div>
  );
}

function Container6() {
  return (
    <div className="content-stretch flex flex-col items-end relative shrink-0 w-full" data-name="Container">
      <div className="flex flex-col font-['Inter:Medium',sans-serif] font-medium h-[20px] justify-center leading-[0] not-italic relative shrink-0 text-[14px] text-[rgba(255,255,255,0.8)] text-right w-[48.16px]">
        <p className="leading-[20px] whitespace-pre-wrap">Nov 24</p>
      </div>
    </div>
  );
}

function Container7() {
  return (
    <div className="content-stretch flex flex-col items-end relative shrink-0 w-full" data-name="Container">
      <div className="flex flex-col font-['Inter:Regular',sans-serif] font-normal h-[16px] justify-center leading-[0] not-italic relative shrink-0 text-[12px] text-[rgba(255,255,255,0.5)] text-right w-[59.47px]">
        <p className="leading-[16px] whitespace-pre-wrap">20:00 EST</p>
      </div>
    </div>
  );
}

function Container5() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Container">
      <Container6 />
      <Container7 />
    </div>
  );
}

function Container2() {
  return (
    <div className="content-stretch flex items-end justify-between relative shrink-0 w-full" data-name="Container">
      <Container3 />
      <Container5 />
    </div>
  );
}

function Margin() {
  return (
    <div className="absolute content-stretch flex flex-col items-start left-0 pb-[24px] px-[24px] right-0 top-[88px]" data-name="Margin">
      <Container2 />
    </div>
  );
}

function OverlayBorder() {
  return (
    <div className="bg-[rgba(255,255,255,0.1)] content-stretch flex items-start px-[9px] py-[5px] relative rounded-[4px] shrink-0" data-name="Overlay+Border">
      <div aria-hidden="true" className="absolute border border-[rgba(255,255,255,0.1)] border-solid inset-0 pointer-events-none rounded-[4px]" />
      <div className="flex flex-col font-['Liberation_Mono:Regular',sans-serif] h-[15px] justify-center leading-[0] not-italic relative shrink-0 text-[10px] text-[rgba(255,255,255,0.8)] tracking-[1px] uppercase w-[77.02px]">
        <p className="leading-[15px] whitespace-pre-wrap">Entry Level</p>
      </div>
    </div>
  );
}

function Heading2() {
  return (
    <div className="content-stretch flex flex-col items-start relative shadow-[0px_2px_2px_0px_rgba(0,0,0,0.06),0px_4px_3px_0px_rgba(0,0,0,0.07)] shrink-0" data-name="Heading 3">
      <div className="flex flex-col font-['Cinzel:Regular',sans-serif] font-normal h-[32px] justify-center leading-[0] relative shrink-0 text-[24px] text-white w-[217.38px]">
        <p className="leading-[32px] whitespace-pre-wrap">Standard Access</p>
      </div>
    </div>
  );
}

function Container9() {
  return (
    <div className="content-stretch flex flex-col gap-[8px] items-start relative shrink-0" data-name="Container">
      <OverlayBorder />
      <Heading2 />
    </div>
  );
}

function Container8() {
  return (
    <div className="relative shrink-0 w-full" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-start justify-between relative w-full">
        <Container9 />
        <div className="relative rounded-[12px] shrink-0 size-[24px]" data-name="Border">
          <div aria-hidden="true" className="absolute border-2 border-[rgba(255,255,255,0.3)] border-solid inset-0 pointer-events-none rounded-[12px]" />
        </div>
      </div>
    </div>
  );
}

function Paragraph() {
  return (
    <div className="content-stretch flex gap-[4px] items-baseline leading-[0] not-italic relative shrink-0 w-full" data-name="Paragraph">
      <div className="flex flex-col font-['Inter:Light',sans-serif] font-light h-[36px] justify-center relative shrink-0 text-[30px] text-white tracking-[-0.75px] w-[52.97px]">
        <p className="leading-[36px] whitespace-pre-wrap">$45</p>
      </div>
      <div className="flex flex-col font-['Inter:Regular',sans-serif] font-normal h-[20px] justify-center relative shrink-0 text-[14px] text-[rgba(255,255,255,0.4)] w-[55.05px]">
        <p className="leading-[20px] whitespace-pre-wrap">/ person</p>
      </div>
    </div>
  );
}

function Container11() {
  return (
    <div className="h-[12px] relative shrink-0 w-[15px]" data-name="Container">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 15 12">
        <g id="Container">
          <path d={svgPaths.p54abeac} fill="var(--fill-0, white)" fillOpacity="0.4" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Container12() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Container">
      <div className="flex flex-col font-['Inter:Regular',sans-serif] font-normal h-[20px] justify-center leading-[0] not-italic relative shrink-0 text-[14px] text-[rgba(255,255,255,0.7)] w-[138.31px]">
        <p className="leading-[20px] whitespace-pre-wrap">Digital Artifact Ticket</p>
      </div>
    </div>
  );
}

function Item() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0 w-full" data-name="Item">
      <Container11 />
      <Container12 />
    </div>
  );
}

function Container13() {
  return (
    <div className="relative shrink-0 size-[13.5px]" data-name="Container">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 13.5 13.5">
        <g id="Container">
          <path d={svgPaths.p143b2880} fill="var(--fill-0, white)" fillOpacity="0.4" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Container14() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Container">
      <div className="flex flex-col font-['Inter:Regular',sans-serif] font-normal h-[20px] justify-center leading-[0] not-italic relative shrink-0 text-[14px] text-[rgba(255,255,255,0.7)] w-[178.14px]">
        <p className="leading-[20px] whitespace-pre-wrap">General Admission Seating</p>
      </div>
    </div>
  );
}

function Item1() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0 w-full" data-name="Item">
      <Container13 />
      <Container14 />
    </div>
  );
}

function List() {
  return (
    <div className="content-stretch flex flex-col gap-[12px] items-start relative shrink-0 w-full" data-name="List">
      <Item />
      <Item1 />
    </div>
  );
}

function Container10() {
  return (
    <div className="relative shrink-0 w-full" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col gap-[16px] items-start relative w-full">
        <Paragraph />
        <div className="bg-gradient-to-r from-[rgba(255,255,255,0.2)] h-px shrink-0 to-[rgba(255,255,255,0)] w-full" data-name="Horizontal Divider" />
        <List />
      </div>
    </div>
  );
}

function BackgroundBorderShadowOverlayBlur() {
  return (
    <div className="backdrop-blur-[10px] relative rounded-[16px] shrink-0 w-full" data-name="Background+Border+Shadow+OverlayBlur" style={{ backgroundImage: "linear-gradient(134.953deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.01) 100%)" }}>
      <div className="overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex flex-col gap-[32px] items-start p-[25px] relative w-full">
          <Container8 />
          <Container10 />
          <div className="absolute bg-gradient-to-r from-[rgba(255,255,255,0)] h-px left-px right-px to-[rgba(255,255,255,0)] top-px via-1/2 via-[rgba(255,255,255,0.8)]" data-name="Horizontal Divider" />
          <div className="absolute inset-px rounded-[16px]" data-name="Gradient" style={{ backgroundImage: "linear-gradient(141.962deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0) 50%, rgba(255, 255, 255, 0) 100%)" }} />
        </div>
      </div>
      <div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0px_0px_20px_1px_rgba(255,255,255,0.02)]" />
      <div aria-hidden="true" className="absolute border border-[rgba(255,255,255,0.2)] border-solid inset-0 pointer-events-none rounded-[16px] shadow-[0px_0px_15px_0px_rgba(255,255,255,0.05)]" />
    </div>
  );
}

function Label() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="Label">
      <div className="absolute bg-white left-0 opacity-0 rounded-[2px] size-[2px] top-0" data-name="Input">
        <div aria-hidden="true" className="absolute border border-[#6b7280] border-solid inset-0 pointer-events-none rounded-[2px]" />
      </div>
      <BackgroundBorderShadowOverlayBlur />
    </div>
  );
}

function Svg() {
  return (
    <div className="relative shrink-0 size-[2px]" data-name="SVG">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 2 2">
        <g clipPath="url(#clip0_15_364)" id="SVG">
          <path d={svgPaths.p13b0b9c0} fill="var(--fill-0, white)" id="Vector" />
        </g>
        <defs>
          <clipPath id="clip0_15_364">
            <rect fill="white" height="2" width="2" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function ImageFill() {
  return (
    <div className="relative shrink-0 size-[2px]" data-name="image fill">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-center justify-center overflow-clip relative rounded-[inherit] size-full">
        <Svg />
      </div>
    </div>
  );
}

function Input() {
  return (
    <div className="absolute bg-[#2563eb] content-stretch flex flex-col items-start left-[-1px] opacity-0 p-px rounded-[2px] size-[4px] top-[-1px]" data-name="Input">
      <div aria-hidden="true" className="absolute border border-[rgba(0,0,0,0)] border-solid inset-0 pointer-events-none rounded-[2px]" />
      <ImageFill />
    </div>
  );
}

function OverlayBorderShadow() {
  return (
    <div className="bg-[rgba(255,215,0,0.2)] content-stretch flex flex-col items-start px-[9px] py-[3px] relative rounded-[4px] shrink-0" data-name="Overlay+Border+Shadow">
      <div aria-hidden="true" className="absolute border border-[rgba(255,215,0,0.3)] border-solid inset-0 pointer-events-none rounded-[4px] shadow-[0px_0px_10px_0px_rgba(255,215,0,0.2)]" />
      <div className="flex flex-col font-['Liberation_Mono:Regular',sans-serif] h-[15px] justify-center leading-[0] not-italic relative shrink-0 text-[#ffd700] text-[10px] tracking-[1px] uppercase w-[49.02px]">
        <p className="leading-[15px] whitespace-pre-wrap">Premium</p>
      </div>
    </div>
  );
}

function Container18() {
  return (
    <div className="relative shrink-0 size-[13.333px]" data-name="Container">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 13.3333 13.3333">
        <g id="Container">
          <path d={svgPaths.p2f0d2880} fill="var(--fill-0, #FFD700)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Container17() {
  return (
    <div className="content-stretch flex gap-[8px] items-center relative shrink-0 w-full" data-name="Container">
      <OverlayBorderShadow />
      <Container18 />
    </div>
  );
}

function Heading3() {
  return (
    <div className="content-stretch flex flex-col items-start relative shadow-[0px_2px_4px_0px_rgba(0,0,0,0.8)] shrink-0 w-full" data-name="Heading 3">
      <div className="bg-clip-text bg-gradient-to-b flex flex-col font-['Cinzel:Extra_Bold',sans-serif] from-[#fcf6ba] h-[32px] justify-center leading-[0] not-italic relative shrink-0 text-[24px] to-[#bf953f] w-[213.95px]" style={{ WebkitTextFillColor: "transparent" }}>
        <p className="leading-[32px] whitespace-pre-wrap">VIP Gold Access</p>
      </div>
    </div>
  );
}

function Container16() {
  return (
    <div className="content-stretch flex flex-col gap-[8px] items-start relative shrink-0" data-name="Container">
      <Container17 />
      <Heading3 />
    </div>
  );
}

function Container19() {
  return (
    <div className="h-[9.1px] relative shrink-0 w-[11.933px]" data-name="Container">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 11.9333 9.1">
        <g id="Container">
          <path d={svgPaths.p1eac7600} fill="var(--fill-0, black)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function BackgroundBorderShadow() {
  return (
    <div className="bg-[#ffd700] content-stretch flex items-center justify-center p-[2px] relative rounded-[12px] shrink-0 size-[24px]" data-name="Background+Border+Shadow">
      <div aria-hidden="true" className="absolute border-2 border-[#ffd700] border-solid inset-0 pointer-events-none rounded-[12px] shadow-[0px_0px_10px_0px_#ffd700]" />
      <Container19 />
    </div>
  );
}

function Container15() {
  return (
    <div className="relative shrink-0 w-full" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-start justify-between relative w-full">
        <Container16 />
        <BackgroundBorderShadow />
      </div>
    </div>
  );
}

function Background() {
  return (
    <div className="bg-gradient-to-r from-[#bf953f] h-[4px] opacity-30 relative shrink-0 to-[#bf953f] via-1/2 via-[#fcf6ba] w-full" data-name="Background">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <div className="absolute left-0 opacity-20 size-[32px] top-[-15px]" data-name="Image">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <img alt="" className="absolute left-0 max-w-none size-full top-0" src={imgImage} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Shadow() {
  return (
    <div className="absolute content-stretch flex flex-col items-start left-0 shadow-[0px_0px_8px_0px_rgba(255,215,0,0.3)] top-0" data-name="Shadow">
      <div className="flex flex-col font-['Inter:Light',sans-serif] font-light h-[40px] justify-center leading-[0] not-italic relative shrink-0 text-[36px] text-white tracking-[-0.9px] w-[77.66px]">
        <p className="leading-[40px] whitespace-pre-wrap">$120</p>
      </div>
    </div>
  );
}

function Container21() {
  return (
    <div className="h-[40px] relative shrink-0 w-full" data-name="Container">
      <Shadow />
      <div className="-translate-y-1/2 absolute flex flex-col font-['Inter:Regular',sans-serif] font-normal h-[20px] justify-center leading-[0] left-[81.66px] not-italic text-[14px] text-[rgba(255,215,0,0.6)] top-[28px] w-[55.05px]">
        <p className="leading-[20px] whitespace-pre-wrap">/ person</p>
      </div>
    </div>
  );
}

function Container22() {
  return (
    <div className="relative shrink-0 w-full" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start relative w-full">
        <div className="flex flex-col font-['Inter:Semi_Bold',sans-serif] font-semibold justify-center leading-[0] not-italic relative shrink-0 text-[10px] text-[rgba(255,215,0,0.5)] tracking-[1px] uppercase w-full">
          <p className="leading-[15px] whitespace-pre-wrap">VIP Perks Included</p>
        </div>
      </div>
    </div>
  );
}

function Container23() {
  return (
    <div className="h-[10.587px] relative shrink-0 w-[12.063px]" data-name="Container">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 12.063 10.5875">
        <g id="Container">
          <path d={svgPaths.p19d0e280} fill="var(--fill-0, #FFD700)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function OverlayBorder1() {
  return (
    <div className="bg-[rgba(255,215,0,0.1)] content-stretch flex items-center justify-center p-px relative rounded-[9999px] shrink-0 size-[24px]" data-name="Overlay+Border">
      <div aria-hidden="true" className="absolute border border-[rgba(255,215,0,0.2)] border-solid inset-0 pointer-events-none rounded-[9999px]" />
      <Container23 />
    </div>
  );
}

function Container24() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Container">
      <div className="flex flex-col font-['Inter:Regular',sans-serif] font-normal h-[20px] justify-center leading-[0] not-italic relative shrink-0 text-[#fcf6ba] text-[14px] w-[105.88px]">
        <p className="leading-[20px] whitespace-pre-wrap">Fast-track Entry</p>
      </div>
    </div>
  );
}

function Item2() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0 w-full" data-name="Item">
      <OverlayBorder1 />
      <Container24 />
    </div>
  );
}

function Container25() {
  return (
    <div className="h-[10.5px] relative shrink-0 w-[7px]" data-name="Container">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 7 10.5">
        <g id="Container">
          <path d={svgPaths.pdbd3170} fill="var(--fill-0, #FFD700)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function OverlayBorder2() {
  return (
    <div className="bg-[rgba(255,215,0,0.1)] content-stretch flex items-center justify-center p-px relative rounded-[9999px] shrink-0 size-[24px]" data-name="Overlay+Border">
      <div aria-hidden="true" className="absolute border border-[rgba(255,215,0,0.2)] border-solid inset-0 pointer-events-none rounded-[9999px]" />
      <Container25 />
    </div>
  );
}

function Container26() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Container">
      <div className="flex flex-col font-['Inter:Regular',sans-serif] font-normal h-[20px] justify-center leading-[0] not-italic relative shrink-0 text-[#fcf6ba] text-[14px] w-[168.03px]">
        <p className="leading-[20px] whitespace-pre-wrap">Exclusive Lounge Access</p>
      </div>
    </div>
  );
}

function Item3() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0 w-full" data-name="Item">
      <OverlayBorder2 />
      <Container26 />
    </div>
  );
}

function Container27() {
  return (
    <div className="h-[10.5px] relative shrink-0 w-[11.667px]" data-name="Container">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 11.6667 10.5">
        <g id="Container">
          <path d={svgPaths.p1e6e3b00} fill="var(--fill-0, #FFD700)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function OverlayBorder3() {
  return (
    <div className="bg-[rgba(255,215,0,0.1)] content-stretch flex items-center justify-center p-px relative rounded-[9999px] shrink-0 size-[24px]" data-name="Overlay+Border">
      <div aria-hidden="true" className="absolute border border-[rgba(255,215,0,0.2)] border-solid inset-0 pointer-events-none rounded-[9999px]" />
      <Container27 />
    </div>
  );
}

function Container28() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Container">
      <div className="flex flex-col font-['Inter:Regular',sans-serif] font-normal h-[20px] justify-center leading-[0] not-italic relative shrink-0 text-[#fcf6ba] text-[14px] w-[147.73px]">
        <p className="leading-[20px] whitespace-pre-wrap">Collectible NFT Badge</p>
      </div>
    </div>
  );
}

function Item4() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0 w-full" data-name="Item">
      <OverlayBorder3 />
      <Container28 />
    </div>
  );
}

function List1() {
  return (
    <div className="relative shrink-0 w-full" data-name="List">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col gap-[12px] items-start relative w-full">
        <Item2 />
        <Item3 />
        <Item4 />
      </div>
    </div>
  );
}

function OverlayBorderOverlayBlur() {
  return (
    <div className="backdrop-blur-[2px] bg-[rgba(0,0,0,0.3)] relative rounded-[12px] shrink-0 w-full" data-name="Overlay+Border+OverlayBlur">
      <div aria-hidden="true" className="absolute border border-[rgba(255,215,0,0.1)] border-solid inset-0 pointer-events-none rounded-[12px]" />
      <div className="content-stretch flex flex-col gap-[12px] items-start p-[17px] relative w-full">
        <Container22 />
        <List1 />
      </div>
    </div>
  );
}

function Container20() {
  return (
    <div className="relative shrink-0 w-full" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col gap-[20px] items-start relative w-full">
        <Container21 />
        <OverlayBorderOverlayBlur />
      </div>
    </div>
  );
}

function BackgroundBorderShadowOverlayBlur1() {
  return (
    <div className="backdrop-blur-[10px] relative rounded-[16px] shrink-0 w-full" data-name="Background+Border+Shadow+OverlayBlur" style={{ backgroundImage: "linear-gradient(160.011deg, rgba(60, 40, 0, 0.4) 0%, rgba(10, 5, 0, 0.8) 100%)" }}>
      <div className="overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex flex-col gap-[24px] items-start p-[25px] relative w-full">
          <div className="absolute inset-px mix-blend-overlay opacity-60 rounded-[16px]" data-name="Gradient" style={{ backgroundImage: "linear-gradient(106.102deg, rgba(255, 215, 0, 0) 30%, rgba(255, 215, 0, 0.15) 50%, rgba(255, 215, 0, 0) 70%)" }} />
          <Container15 />
          <Background />
          <Container20 />
        </div>
      </div>
      <div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0px_0px_30px_1px_rgba(255,215,0,0.05)]" />
      <div aria-hidden="true" className="absolute border border-[rgba(255,215,0,0.3)] border-solid inset-0 pointer-events-none rounded-[16px] shadow-[0px_0px_30px_0px_rgba(255,215,0,0.15)]" />
    </div>
  );
}

function Label1() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="Label">
      <Input />
      <BackgroundBorderShadowOverlayBlur1 />
    </div>
  );
}

function Container29() {
  return (
    <div className="relative shrink-0 w-full" data-name="Container">
      <div className="flex flex-col items-center size-full">
        <div className="content-stretch flex flex-col items-center pb-[16px] px-[32px] relative w-full">
          <div className="flex flex-col font-['Inter:Regular',sans-serif] font-normal h-[32px] justify-center leading-[16px] not-italic relative shrink-0 text-[12px] text-[rgba(255,255,255,0.3)] text-center w-[230.6px] whitespace-pre-wrap">
            <p className="mb-0">By purchasing you agree to the Terms of</p>
            <p>Service. Artifacts are non-refundable.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Main() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[24px] inset-[207px_0_-67px_0] items-start pb-[96px] px-[24px]" data-name="Main">
      <Label />
      <Label1 />
      <Container29 />
    </div>
  );
}

function Container32() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="Container">
      <div className="flex flex-col font-['Inter:Regular',sans-serif] font-normal h-[15px] justify-center leading-[0] not-italic relative shrink-0 text-[10px] text-[rgba(255,255,255,0.5)] tracking-[0.25px] uppercase w-[32.92px]">
        <p className="leading-[15px] whitespace-pre-wrap">Total</p>
      </div>
    </div>
  );
}

function Container33() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="Container">
      <div className="flex flex-col font-['Cinzel:Extra_Bold',sans-serif] h-[32px] justify-center leading-[0] not-italic relative shrink-0 text-[24px] text-white w-[92.05px]">
        <p className="leading-[32px] whitespace-pre-wrap">$120.00</p>
      </div>
    </div>
  );
}

function Container31() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Container">
      <Container32 />
      <Container33 />
    </div>
  );
}

function Container34() {
  return (
    <div className="content-stretch flex flex-col items-center relative shrink-0" data-name="Container">
      <div className="flex flex-col font-['Inter:Semi_Bold',sans-serif] font-semibold h-[28px] justify-center leading-[0] not-italic relative shrink-0 text-[18px] text-black text-center tracking-[0.45px] w-[144.89px]">
        <p className="leading-[28px] whitespace-pre-wrap">Acquire Artifact</p>
      </div>
    </div>
  );
}

function Container35() {
  return (
    <div className="relative shrink-0 size-[13.333px]" data-name="Container">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 13.3333 13.3333">
        <g id="Container">
          <path d={svgPaths.p32510800} fill="var(--fill-0, black)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Button2() {
  return (
    <div className="bg-white content-stretch flex flex-[1_0_0] gap-[8px] h-[56px] items-center justify-center min-h-px min-w-px relative rounded-[9999px] shadow-[0px_0px_20px_0px_rgba(255,255,255,0.3)]" data-name="Button">
      <Container34 />
      <Container35 />
    </div>
  );
}

function Container30() {
  return (
    <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-name="Container">
      <Container31 />
      <Button2 />
    </div>
  );
}

function Background1() {
  return (
    <div className="absolute bg-gradient-to-t bottom-0 content-stretch flex flex-col from-black items-start left-0 pb-[32px] pt-[48px] px-[24px] right-0 to-[rgba(0,0,0,0)] via-1/2 via-[rgba(0,0,0,0.9)]" data-name="Background">
      <Container30 />
    </div>
  );
}

export default function Body() {
  return (
    <div className="bg-[#050505] relative size-full" data-name="Body">
      <div className="absolute bg-[#1e3a8a] blur-[60px] left-[-78px] opacity-20 rounded-[9999px] size-[500px] top-[-88.39px]" data-name="Background+Blur" />
      <div className="absolute bg-[#ffd700] blur-[70px] bottom-[-88.39px] opacity-10 right-[-39px] rounded-[9999px] size-[400px]" data-name="Background+Blur" />
      <div className="absolute flex items-center justify-center right-[3.94px] size-[72.125px] top-[190.73px]" style={{ "--transform-inner-width": "1185", "--transform-inner-height": "0" } as React.CSSProperties}>
        <div className="flex-none rotate-45">
          <div className="bg-white h-[100px] opacity-10 w-[2px]" data-name="Vertical Divider" />
        </div>
      </div>
      <div className="absolute flex items-center justify-center right-[10.27px] size-[43.841px] top-[229.08px]" style={{ "--transform-inner-width": "1185", "--transform-inner-height": "0" } as React.CSSProperties}>
        <div className="flex-none rotate-45">
          <div className="bg-white h-[60px] opacity-5 w-[2px]" data-name="Vertical Divider" />
        </div>
      </div>
      <Header />
      <Margin />
      <Main />
      <Background1 />
    </div>
  );
}