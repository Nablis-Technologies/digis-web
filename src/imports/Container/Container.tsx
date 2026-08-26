import svgPaths from "./svg-kj11gp19hl";

function Text() {
  return (
    <div className="h-[9.001px] relative shrink-0 w-[68.61px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <p className="[word-break:break-word] absolute font-['Space_Grotesk:Regular',sans-serif] font-normal leading-[9px] left-0 text-[9px] text-[rgba(255,255,255,0.4)] top-[-0.7px] tracking-[1.8px] uppercase whitespace-nowrap">Total</p>
      </div>
    </div>
  );
}

function Text1() {
  return (
    <div className="absolute h-[18.003px] left-0 top-0 w-[43.492px]" data-name="Text">
      <p className="[word-break:break-word] absolute font-['Unbounded:Light',sans-serif] font-light leading-[18px] left-0 text-[18px] text-white top-[-0.84px] tracking-[-0.3px] whitespace-nowrap">850</p>
    </div>
  );
}

function Container2() {
  return (
    <div className="h-[19.536px] relative shrink-0 w-[68.61px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <Text1 />
        <p className="[word-break:break-word] absolute font-['Space_Grotesk:Regular',sans-serif] font-normal leading-[15px] left-[47.49px] text-[10px] text-[rgba(255,255,255,0.45)] top-[4.67px] tracking-[1px] whitespace-nowrap">ETB</p>
      </div>
    </div>
  );
}

function Container1() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[5.998px] h-[34.535px] items-start left-[20px] top-[17.22px] w-[68.61px]" data-name="Container">
      <Text />
      <Container2 />
    </div>
  );
}

function Container3() {
  return <div className="absolute bg-[rgba(255,255,255,0.08)] h-[36.998px] left-[104.6px] top-[15.99px] w-[0.992px]" data-name="Container" />;
}

function Icon() {
  return (
    <div className="relative shrink-0 size-[16.993px]" data-name="Icon">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16.993 16.993">
        <g id="Icon">
          <path d={svgPaths.p31451400} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.6" strokeWidth="1.23907" />
          <path d="M8.4965 5.66433V14.8689" id="Vector_2" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.6" strokeWidth="1.23907" />
          <path d={svgPaths.p16c70860} id="Vector_3" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.6" strokeWidth="1.23907" />
          <path d={svgPaths.p275ae3e0} id="Vector_4" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.6" strokeWidth="1.23907" />
        </g>
      </svg>
    </div>
  );
}

function ButtonGiftThisTicket() {
  return (
    <div className="absolute bg-[rgba(255,255,255,0.04)] content-stretch flex h-[40px] items-center justify-center left-[118.43px] px-[11.5px] py-[0.567px] rounded-[14px] top-[14.49px] w-[56px]" data-name="Button - Gift this ticket">
      <div aria-hidden="true" className="absolute border-[0.567px] border-[rgba(255,255,255,0.08)] border-solid inset-0 pointer-events-none rounded-[14px]" />
      <Icon />
      <p className="[word-break:break-word] font-['Space_Grotesk:Medium',sans-serif] font-medium leading-[21px] relative shrink-0 text-[9px] text-center text-white tracking-[0.3px] w-[23px]">Gift</p>
    </div>
  );
}

function Text2() {
  return (
    <div className="h-[20.998px] relative shrink-0 w-[79.02px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <p className="-translate-x-1/2 [word-break:break-word] absolute font-['Space_Grotesk:Medium',sans-serif] font-medium leading-[21px] left-[40.5px] text-[#0a0a0a] text-[14px] text-center top-[0.7px] tracking-[0.3px] whitespace-nowrap">Get Tickets</p>
      </div>
    </div>
  );
}

function Icon1() {
  return (
    <div className="relative shrink-0 size-[15.992px]" data-name="Icon">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 15.9918 15.9918">
        <g id="Icon">
          <path d="M3.33163 7.9959H12.6602" id="Vector" stroke="var(--stroke-0, #0A0A0A)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.49923" />
          <path d={svgPaths.p28f7db00} id="Vector_2" stroke="var(--stroke-0, #0A0A0A)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.49923" />
        </g>
      </svg>
    </div>
  );
}

function Button() {
  return (
    <div className="absolute content-stretch flex gap-[7.991px] h-[45px] items-center justify-center left-[187.43px] pl-[17.401px] pr-[17.409px] py-[12px] rounded-[14px] top-[12.43px] w-[128px]" style={{ backgroundImage: "linear-gradient(160.63deg, rgb(234, 255, 0) 0%, rgb(217, 255, 0) 100%)" }} data-name="Button">
      <Text2 />
      <Icon1 />
    </div>
  );
}

export default function Container() {
  return (
    <div className="border-[0.567px] border-[rgba(255,255,255,0.08)] border-solid relative rounded-[16px] size-full" data-name="Container">
      <Container1 />
      <Container3 />
      <ButtonGiftThisTicket />
      <Button />
    </div>
  );
}